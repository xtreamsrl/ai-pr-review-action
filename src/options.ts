export const SUPPORTED_EVENTS = ['pull_request_target'];
export const SUPPORTED_ACTIONS = ['opened', 'labeled'];
export const SUPPORTED_FILE_EXTENSIONS = ['.js', '.ts', '.py', '.java'];

export class Options {
  openaiApiKey: string;
  openaiApiBaseUrl: string;
  openaiModel: 'gpt-4' | 'gpt-3.5-turbo';

  constructor(params: {
    openaiApiBaseUrl: string;
    openaiModel: string;
  }) {
    this.openaiApiKey = process.env.OPENAI_API_KEY!;
    this.openaiApiBaseUrl = params.openaiApiBaseUrl;
    this.openaiModel = Options.parseGptModel(params.openaiModel);
  }

  private static parseGptModel(model: string): 'gpt-4' | 'gpt-3.5-turbo' {
    switch (model) {
      case 'gpt-4':
        return 'gpt-4';
      case 'gpt-3.5-turbo':
        return 'gpt-3.5-turbo';
      default:
        throw new Error(`Invalid model: ${model}`);
    }
  }
}
