import { program, Option } from 'commander';
import { Reviewer } from './reviewer';
import { Options as Config } from './options';
import { cliCanRun } from './utils';

type CliOptions = {
  pr: number;
  repository: string;
  owner: string;
  model: 'gtp-3.5-turbo' | 'gtp-4';
}

(async () => {
  program
    .name('ai-pr-review')
    .description('xtream AI-based PR Reviewer');

  program.command('review')
    .requiredOption('-p, --pr <number>', 'PR number to review')
    .requiredOption('-r, --repository <string>', 'Repository name to review')
    .requiredOption('-o, --owner <string>', 'Repository owner')
    .addOption(new Option('-m, --model <string>', 'OpenAI GPT model to use').choices(['gpt-3.5-turbo', 'gpt-4']).makeOptionMandatory(true))
    .action(async (options: CliOptions) => {
      if(cliCanRun()) {
        const config = new Config({
          openaiApiBaseUrl: 'https://api.openai.com/v1',
          openaiModel: options.model,
        });
        const reviewer = new Reviewer(config);
        console.log(`Reviewing PR #${options.pr} in repository ${options.owner}/${options.repository} with model '${options.model}'.`);
        await reviewer.review({
          repo: options.repository,
          owner: options.owner,
          pullRequestNumber: options.pr,
        });
      }
    });
  await program.parseAsync(process.argv);
  console.log('Done.');
})();
