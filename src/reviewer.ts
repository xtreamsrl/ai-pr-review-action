import { Options } from './options';
import pLimit, { LimitFunction } from 'p-limit';
import { basePrompt, InputPrompt, PromptFactory, prompts } from './prompts';
import { openaiClient } from './openaiClient';
import { octokit } from './octokit';
import { ContextWithPullRequest } from './utils';

type ReviewComment = {
  comment: string;
  fileName: string;
  patch: string;
  prompt: string;
}

export class Reviewer {
  private readonly options: Options;
  private readonly basePrompt = basePrompt;
  private readonly reviewPrompts = prompts;
  private readonly openaiConcurrencyLimit: LimitFunction;
  private readonly githubConcurrencyLimit: LimitFunction;
  private readonly promptFactory: PromptFactory;

  constructor(options: Options) {
    this.options = options;
    this.openaiConcurrencyLimit = pLimit(options.openaiConcurrencyLimit)
    this.githubConcurrencyLimit = pLimit(options.githubConcurrencyLimit)
    this.promptFactory = new PromptFactory({
      basePrompt: this.basePrompt,
    });
  }

  async getCommentFromGPT(inputPrompt: InputPrompt): Promise<ReviewComment> {
    const chatCompletion = await openaiClient.createChatCompletion({
      model: this.options.openaiModel,
      temperature: this.options.openaiModelTemperature,
      messages: [{ role: "user", content: inputPrompt.prompt }],
    });
    return {
      ...inputPrompt,
      comment: chatCompletion.data.choices[0].message?.content ?? 'null'
    }
  }

  private buildPrompts(acceptedFiles: { patch: string, filename: string }[]) {
    const prompts= [];
    for (let j = 0; j < acceptedFiles.length; j++) {
      for (let i = 0; i < this.reviewPrompts.length; i++) {
        const prompt = this.promptFactory.build(acceptedFiles[j], this.reviewPrompts[i]);
        prompts.push(prompt);
      }
    }
    return prompts;
  }

  private async postComment(comment: ReviewComment, commits: { sha: string }[], context: ContextWithPullRequest) {
    return await octokit.pulls.createReviewComment({
      repo: context.repo.repo,
      owner: context.repo.owner,
      pull_number: context.payload.pull_request.number,
      commit_id: commits[commits.length - 1].sha,
      path: comment.fileName,
      body: comment.comment,
      position: comment.patch.split('\n').length - 1,
    });
  }

  async review(acceptedFiles: { patch: string, filename: string }[], commits: { sha: string }[], context: ContextWithPullRequest): Promise<void> {
    const prompts = this.buildPrompts(acceptedFiles);
    const reviewPromises = prompts.map((prompt) => this.openaiConcurrencyLimit(() => this.getCommentFromGPT(prompt)));
    const reviewComments = await Promise.all(reviewPromises);
    const comments = reviewComments.filter((comment) => comment.comment !== 'null');
    const commentsPromises = comments.map((comment) => this.githubConcurrencyLimit(() => this.postComment(comment, commits, context)));
    await Promise.all(commentsPromises);
  }
}