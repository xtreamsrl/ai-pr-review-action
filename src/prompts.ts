import { basePrompt } from './prompts/base-prompt';
import { modernizeCodePrompt } from './prompts/modernize-code-prompt';
import { srpPrompt } from './prompts/srp-prompt';
import { variableNamingPrompt } from './prompts/variable-naming-prompt';

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

export class TemplatePrompt {
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

export const templatePrompt = new TemplatePrompt(basePrompt);
export const reviewPrompts = [
  new ReviewPrompt(modernizeCodePrompt),
  new ReviewPrompt(srpPrompt),
  new ReviewPrompt(variableNamingPrompt),
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
  private readonly basePrompt: TemplatePrompt;

  constructor(params: {
    basePrompt: TemplatePrompt;
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
