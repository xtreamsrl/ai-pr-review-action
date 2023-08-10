import { Options } from './options';
import { error, info, warning } from '@actions/core';
import { context as GITHUB_CONTEXT } from '@actions/github';
import { actionCanRun } from './utils';
import { Reviewer } from './reviewer';
import { GithubContext } from './octokit';

(async () => {
  let doneWithErrors = false;
  try {
    const context: GithubContext = GITHUB_CONTEXT;

    if (actionCanRun(context)) {
      const options: Options = new Options({
        openaiModel: process.env.OPENAI_MODEL!,
        openaiApiBaseUrl: process.env.OPENAI_API_BASE_URL!,
      });
      info(`Running with options: ${JSON.stringify(options)}`);

      const reviewer = new Reviewer(options);
      await reviewer.review(context);
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
