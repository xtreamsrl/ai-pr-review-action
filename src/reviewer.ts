import { Options } from './options';
import pLimit from 'p-limit';
import { templatePrompt, InputPrompt, PromptFactory, reviewPrompts } from './prompts';
import { openaiClient } from './openaiClient';
import { info } from '@actions/core';

export type ReviewComment = {
  message: string;
  fileName: string;
  patch: string;
  prompt: string;
}

export class Reviewer {
  private readonly options: Options;
  private readonly basePrompt = templatePrompt;
  private readonly reviewPrompts = reviewPrompts;
  private readonly openaiConcurrencyLimit; // todo : move to openai client
  private readonly promptFactory: PromptFactory;

  constructor(options: Options) {
    this.options = options;
    this.openaiConcurrencyLimit = pLimit(options.openaiConcurrencyLimit)
    this.promptFactory = new PromptFactory({
      basePrompt: this.basePrompt,
    });
  }

  private async getCommentFromGPT(inputPrompt: InputPrompt): Promise<ReviewComment> {
    const chatCompletion = await openaiClient.createChatCompletion({
      model: this.options.openaiModel,
      temperature: this.options.openaiModelTemperature,
      messages: [{ role: "user", content: inputPrompt.prompt }],
    });
    return {
      ...inputPrompt,
      message: chatCompletion.data.choices[0].message?.content ?? 'null'
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

  async getReviewComments(acceptedFiles: { patch: string, filename: string }[]): Promise<ReviewComment[]> {
    const prompts = this.buildPrompts(acceptedFiles);
    info(`Generated ${prompts.length} prompts`);
    const reviewPromises = prompts.map((prompt) => this.openaiConcurrencyLimit(() => this.getCommentFromGPT(prompt)));
    const reviewComments = await Promise.all(reviewPromises);
    info(`Generated ${reviewComments.length} comments`);
    const comments = reviewComments.filter((comment) => comment.message !== 'null');
    info(`Filtered (non 'null') ${comments.length} comments`);
    return comments;
  }
}