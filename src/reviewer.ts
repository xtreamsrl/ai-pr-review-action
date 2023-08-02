import { Options } from './options';
import { SingleDiffPrompt } from './prompts';
import { info, warning } from '@actions/core';
import { createOpenAILanguageModel } from 'typechat/dist/model';
import fs from 'fs';
import path from 'node:path';
import { createJsonTranslator, Result, TypeChatJsonTranslator } from 'typechat';
import { CommentSchema } from './commentSchema';
import { Error } from 'typechat/dist/result';

export class ReviewComment implements CommentSchema {
  endLine: number;
  message: string;
  severity: number;
  startLine: number;
  fileName: string;
  startSide: 'LEFT' | 'RIGHT';

  constructor(comment: CommentSchema, fileName: string) {
    this.fileName = fileName;
    this.startSide = 'RIGHT';
    this.message = comment.message;
    this.startLine = comment.startLine;
    this.endLine = comment.endLine;
    this.severity = comment.severity;
  }
}

export class Reviewer {
  private readonly options: Options;
  private readonly translator: TypeChatJsonTranslator<CommentSchema>;

  constructor(options: Options) {
    this.options = options;
    const model = createOpenAILanguageModel(options.openaiApiKey, options.openaiModel);
    const schema = fs.readFileSync(path.join(__dirname, 'commentSchema.ts'), 'utf8');
    this.translator = createJsonTranslator<CommentSchema>(model, schema, 'CommentSchema');
  }

  private async getComment(prompt: string) {
    return await this.translator.translate(prompt);
  }

  private splitPatch(patch: string): string[] {
    if (!patch) {
      return [];
    }

    const pattern = /(^@@ -(\d+),(\d+) \+(\d+),(\d+) @@).*$/gm;

    const result: string[] = [];
    let last = -1;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(patch)) !== null) {
      if (last === -1) {
        last = match.index;
      } else {
        result.push(patch.substring(last, match.index));
        last = match.index;
      }
    }
    if (last !== -1) {
      result.push(patch.substring(last));
    }
    return result;
  }

  private buildPromptsPerDiff(acceptedFiles: { patch: string; filename: string }[]) {
    const promptTemplate = new SingleDiffPrompt();
    const prompts: { fileName: string; prompt: string }[] = [];
    for (const file of acceptedFiles) {
      const patches = this.splitPatch(file.patch);
      for (const patch of patches) {
        const prompt = promptTemplate.build({ diff: patch });
        prompts.push({ fileName: file.filename, prompt });
      }
    }
    return prompts;
  }

  async getReviewComments(acceptedFiles: { patch: string, filename: string }[]): Promise<ReviewComment[]> {
    // Generate prompts
    const prompts = this.buildPromptsPerDiff(acceptedFiles);
    info(`Generated ${prompts.length} prompts`);

    // Generate comments
    const reviewComments: ReviewComment[] = [];
    const errors: Error[] = [];
    for (const prompt of prompts) {
      const comment = await this.getComment(prompt.prompt);
      if (comment.success) {
        reviewComments.push(new ReviewComment(comment.data, prompt.fileName));
      } else {
        errors.push(comment);
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
}