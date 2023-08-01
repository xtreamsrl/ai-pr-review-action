import { Options } from './options';
import { getInput, info, setFailed } from '@actions/core';
import { context as GIT_HUB_CONTEXT } from '@actions/github';
import { octokit } from './octokit';
import { canRun, filterAcceptedFiles } from './utils';
import { Reviewer } from './reviewer';

(async () => {
  try {
    const context = GIT_HUB_CONTEXT;
    const repo = context.repo;

    if (canRun(context)) {
      const options: Options = new Options({
        openaiModel: getInput('openai_model'),
        openaiApiBaseUrl: getInput('openai_api_base_url'),
        openaiConcurrencyLimit: getInput('openai_concurrency_limit'),
        openaiModelTemperature: getInput('openai_model_temperature'),
        openaiRetries: getInput('openai_retries'),
        openaiTimeoutMs: getInput('openai_timeout_ms'),
        githubConcurrencyLimit: getInput('github_concurrency_limit'),
      });

      // Fetch the diff between the target branch's base commit and the latest commit of the PR branch
      const targetBranchDiff = await octokit.repos.compareCommits({
        owner: repo.owner,
        repo: repo.repo,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
      });
      info(`Running with options: ${JSON.stringify(options)}`);
      const { files: changedFiles, commits } = targetBranchDiff.data;
      if (!changedFiles?.length) {
        info('No changed files found');
        return;
      }
      info(`Found ${changedFiles.length} changed files`);
      info(`Changed files: ${JSON.stringify(changedFiles)}`);
      const acceptedFiles = filterAcceptedFiles(changedFiles);
      info(`Found ${acceptedFiles.length} accepted files`);
      info(`Accepted files: ${JSON.stringify(acceptedFiles)}`);
      const reviewer = new Reviewer(options);
      await reviewer.review(acceptedFiles, commits, context);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      setFailed(`Failed to run: ${error.message}, backtrace: ${error.stack}`);
    } else {
      setFailed(`Failed to run: ${error}`);
    }
  }
})();
