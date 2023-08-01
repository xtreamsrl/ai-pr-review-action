export class ReviewPrompt {
  readonly goal: string;
  readonly name: string;

  constructor(params: {
    goal: string;
    name: string;
  }) {
    this.goal = params.goal;
    this.name = params.name;
  }
}

export class BasePrompt {
  private readonly promptTemplate: string;
  constructor(params: {
    promptTemplate: string;
  }) {
    this.promptTemplate = params.promptTemplate;
  }

  build(reviewPrompt: ReviewPrompt, diff: string): string {
    return this.promptTemplate
      .replace('{goal}', reviewPrompt.goal)
      .replace('{diff}', diff);
  }
}

export const basePrompt = new BasePrompt(require('./prompts/base-prompt'));
export const prompts = [
  new ReviewPrompt(require('./prompts/modernize-code-prompt')),
  new ReviewPrompt(require('./prompts/srp-prompt')),
  new ReviewPrompt(require('./prompts/variable-naming-prompt')),
];

export class InputPrompt {
  prompt: string;
  fileName: string;
  patch: string;

  constructor(params: {
    prompt: string;
    fileName: string;
    patch: string;
  }) {
    this.prompt = params.prompt;
    this.fileName = params.fileName;
    this.patch = params.patch;
  }
}

export class PromptFactory {
  private readonly basePrompt: BasePrompt;

  constructor(params: {
    basePrompt: BasePrompt;
  }) {
    this.basePrompt = params.basePrompt;
  }

  build(file: { patch: string, filename: string }, reviewPrompt: ReviewPrompt): InputPrompt {
    return new InputPrompt({
      prompt: this.basePrompt.build(reviewPrompt, file.patch),
      fileName: file.filename,
      patch: file.patch,
    });
  }
}
