import * as fs from 'fs';
import path from 'node:path';

const DIFF_PROMPT_FILENAME = 'diffPrompt.md';

export class TemplatePrompt<T extends Record<string, string>> {
  private readonly template: string;
  constructor(template: string) {
    this.template = template;
  }
  build(params: T): string {
    let buildPrompt = this.template;
    for (const key in params) {
      buildPrompt = buildPrompt.replace(`{${key}}`, params[key]);
    }
    return buildPrompt;
  }
}

export class DiffPrompt extends TemplatePrompt<{diff: string}> {
  constructor() {
    const rawTemplatePrompt = fs.readFileSync(path.join(__dirname, DIFF_PROMPT_FILENAME), 'utf8');
    super(rawTemplatePrompt);
  }
}
