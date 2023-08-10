import { Options, SUPPORTED_FILE_EXTENSIONS } from './options';
import { DiffPrompt } from './prompts';
import { debug, info, warning } from '@actions/core';
import fs from 'fs';
import path from 'node:path';
import { createJsonTranslator, createOpenAILanguageModel, Error, TypeChatJsonTranslator } from 'typechat';
import { CommentArraySchema, CommentSchema } from './commentArraySchema';
import { GhContextWithPullRequest, octokit, submitReview } from './octokit';

export class ReviewComment implements CommentSchema {
  fileName: string;
  message: string;
  startLine: number;
  endLine: number;
  severity: number;

  constructor(comment: CommentSchema, fileName: string) {
    this.fileName = fileName;
    this.message = comment.message;
    this.startLine = comment.startLine;
    this.endLine = comment.endLine;
    this.severity = comment.severity;
  }
}

export class Reviewer {
  private readonly options: Options;
  private readonly translator: TypeChatJsonTranslator<CommentArraySchema>;

  constructor(options: Options) {
    this.options = options;
    const model = createOpenAILanguageModel(options.openai_Api_Key, options.openaiModel);
    const schema = fs.readFileSync(path.join(__dirname, 'commentArraySchema.ts'), 'utf8');
    this.translator = createJsonTranslator<CommentArraySchema>(model, schema, 'CommentArraySchema');
  }

  private getComments(prompt: string) {
    return this.translator.translate(prompt);
  }

  private buildPromptsPerFile(acceptedFiles: { patch: string; filename: string }[]) {
    const promptTemplate = new DiffPrompt();
    const prompts: { fileName: string; prompt: string }[] = [];
    for (const file of acceptedFiles) {
      const prompt = promptTemplate.build({ diff: file.patch });
      prompts.push({ fileName: file.filename, prompt });
    }
    return prompts;
  }

  private async getReviewComments(acceptedFiles: { patch: string, filename: string }[]): Promise<ReviewComment[]> {
    // Generate prompts
    const prompts = this.buildPromptsPerFile(acceptedFiles);
    info(`Generated ${prompts.length} prompts`);

    // Generate comments
    let reviewComments: ReviewComment[] = [];
    const errors: Error[] = [];
    for (const prompt of prompts) {
      const commentArray = await this.getComments(prompt.prompt);
      if (commentArray.success) {
        reviewComments = reviewComments.concat(commentArray.data.comments.map(comment => new ReviewComment(comment, prompt.fileName)));
      } else {
        errors.push(commentArray);
      }
    }
    info(`Generated ${reviewComments.length} valid comments`);
    if (errors.length > 0) {
      warning(`Generated ${errors.length} invalid comments`);
      for (const error of errors) {
        warning(`Error: ${error.message}`);
      }
    }

    // Filter comments
    const significantComments = reviewComments.filter((comment) => comment.severity > 1);
    info(`Filtered (severity) ${significantComments.length} comments`);
    return significantComments;
  }

  /**
   * Filter out:
   * - files that we don't support
   * - files that are not added or modified
   * - files that have no patch
   * @param changedFiles
   */
  private filterAcceptedFiles<T extends {filename: string, status: string, patch?: string }>(changedFiles: T[]): (Omit<T, 'patch'> & { patch: string })[] {
    return changedFiles.filter(
      f => SUPPORTED_FILE_EXTENSIONS.includes(path.extname(f.filename)) &&
        (f.status === 'added' || f.status === 'modified') &&
        f.patch,
    ) as (Omit<T, 'patch'> & { patch: string })[];
  }

  async review(context: GhContextWithPullRequest): Promise<void>;
  async review(context: { repo: string, owner: string, pullRequestNumber: number }): Promise<void>;
  async review(context: GhContextWithPullRequest | { repo: string, owner: string, pullRequestNumber: number }): Promise<void> {
    console.log('REVIEW entered')
    let pullRequest;
    let owner;
    let repo;
    let pullRequestNumber;
    if ('pullRequestNumber' in context) {
      // Retrieve pull request information
      const { data } = await octokit.pulls.get({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullRequestNumber,
      });
      pullRequest = data;
      owner = context.owner;
      repo = context.repo;
      pullRequestNumber = context.pullRequestNumber;
    } else {
      pullRequest = context.payload.pull_request;
      owner = context.repo.owner;
      repo = context.repo.repo;
      pullRequestNumber = context.payload.pull_request.number;
    }
    if (!pullRequest) {
      throw new Error(`Pull request ${pullRequestNumber} data not found`);
    }
    // Fetch the diff between the target branch's base commit and the latest commit of the PR branch
    const targetBranchDiff = await octokit.repos.compareCommits({
      owner,
      repo,
      base: pullRequest.base.sha,
      head: pullRequest.head.sha,
    });
    const { files: changedFiles, commits } = targetBranchDiff.data;
    if (!changedFiles?.length) {
      info('No changed files found');
      return;
    }
    info(`Found ${changedFiles.length} changed files`);
    info(`Changed files: ${JSON.stringify(changedFiles.map((file) => file.filename))}`);

    const acceptedFiles = this.filterAcceptedFiles(changedFiles);
    info(`Found ${acceptedFiles.length} accepted files`);
    info(`Accepted files: ${JSON.stringify(acceptedFiles.map((file) => file.filename))}`);

    debug(JSON.stringify(acceptedFiles));
    const comments = await this.getReviewComments(acceptedFiles);

    const commitId = commits[commits.length - 1].sha;
    info(`Submitting review for PR #${pullRequestNumber}, total comments: ${comments.length}`);
    await submitReview(comments, pullRequestNumber, commitId, owner, repo);
  }
}