# AI-PR-REVIEW

`ai-pr-review` is a tool designed to enhance developer productivity and efficiency by performing 
automated reviews of GitHub pull requests.

## Features
- Review are performed by default one-time on the entire pull request, not on a per-commit basis. 
  This is because the tool is designed to be used as a preliminary review tool, not as a 
  replacement of the entire review process.
- Reviews can be triggered on-demand by adding a label named `ai-review` to a pull request.

## Installation

`ai-pr-review` runs as a GitHub Action. Add the below file to your repository at 
`.github/workflows/ai-pr-reviewer.yml`:

```yaml
on:
  pull_request_target:
    types:
      - opened
      - labeled

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    name: AI PR Review
    steps:
      - name: AI PR Review
        uses: xtreamsrl/ai-pr-review@v1
        with:
          openai_model: 'gpt-3.5-turbo'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Environment variables
- `GITHUB_TOKEN`: This should already be available to the GitHub Action environment. This is used to add comments to the pull request.
- `OPENAI_API_KEY`: use this to authenticate with OpenAI API. You can get one [here](https://platform.openai.com/account/api-keys). Please add this key to your GitHub Action secrets.

## Disclaimer
- Your code (files, diff) will be sent to OpenAI's servers for processing. Please check with your compliance team before using this on your private code repositories.
- OpenAI's API is used instead of ChatGPT session on their portal. OpenAI API has a [more conservative data usage policy](https://openai.com/policies/api-data-usage-policies) compared to their ChatGPT offering.
- This action is not affiliated with OpenAI.
