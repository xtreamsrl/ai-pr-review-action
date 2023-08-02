import { Options } from './options';
import { error, info, warning } from '@actions/core';
import { context as GITHUB_CONTEXT } from '@actions/github';
import { octokit, postComment } from './octokit';
import { canRun, filterAcceptedFiles } from './utils';
import { Reviewer } from './reviewer';
import pLimit from 'p-limit';

(async () => {
  let doneWithErrors = false;
  try {
    const context = GITHUB_CONTEXT;
    const repo = context.repo;

    if (canRun(context)) {
      const options: Options = new Options({
        openai_Model: process.env.OPENAI_MODEL!,
        openai_Api_BaseUrl: process.env.OPENAI_API_BASE_URL!,
        openaiConcurrencyLimit: process.env.OPENAI_CONCURRENCY_LIMIT!,
        openaiModelTemperature: process.env.OPENAI_MODEL_TEMPERATURE!,
        github_Concurrency_Limit: process.env.GITHUB_CONCURRENCY_LIMIT!,
      });
      info(`Running with options: ${JSON.stringify(options)}`);

      // Fetch the diff between the target branch's base commit and the latest commit of the PR branch
      const targetBranchDiff = await octokit.repos.compareCommits({
        owner: repo.owner,
        repo: repo.repo,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
      });
      const { files: changedFiles, commits } = targetBranchDiff.data;
      if (!changedFiles?.length) {
        info('No changed files found');
        return;
      }
      info(`Found ${changedFiles.length} changed files`);
      info(`Changed files: ${JSON.stringify(changedFiles.map((file) => file.filename))}`);

      const acceptedFiles = filterAcceptedFiles(changedFiles);
      info(`Found ${acceptedFiles.length} accepted files`);
      info(`Accepted files: ${JSON.stringify(acceptedFiles.map((file) => file.filename))}`);

      const reviewer = new Reviewer(options);
      const comments = await reviewer.getReviewComments(acceptedFiles);

      info(`Posting ${comments.length} review comments`);
      const githubConcurrencyLimit = pLimit(options.githubConcurrencyLimit);
      const commentsPromises = comments.map((comment) => githubConcurrencyLimit(() => postComment(comment, commits, context)));
      await Promise.all(commentsPromises);
    }
  } catch (e: unknown) {
    doneWithErrors = true;
    if (e instanceof Error) {
      error(e);
    } else {
      error(`Failed to run with error: ${e}`);
    }
  } finally {
    // Always log that we're done and exit gracefully. Even if we failed we don't want to fail the action.
    if (doneWithErrors) {
      warning('Done with errors.');
    } else {
      info('Done.');
    }
  }
})();
