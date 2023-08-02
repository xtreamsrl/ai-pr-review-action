export const SUPPORTED_EVENTS = ['pull_request_target'];
export const SUPPORTED_ACTIONS = ['opened'];
export const SUPPORTED_FILE_EXTENSIONS = ['.js', '.ts', '.py', '.java'];

export class Options {
  openaiApiBaseUrl: string;
  openaiModel: 'gpt-4' | 'gpt-3.5-turbo';
  openaiModelTemperature: number;
  openaiConcurrencyLimit: number;
  githubConcurrencyLimit: number;

  constructor(params: {
    openaiApiBaseUrl: string;
    openaiModel: string;
    openaiModelTemperature: string;
    openaiConcurrencyLimit: string;
    githubConcurrencyLimit: string;
  }) {
    this.openaiApiBaseUrl = params.openaiApiBaseUrl;
    this.openaiModel = Options.parseGptModel(params.openaiModel);
    this.openaiModelTemperature = parseFloat(params.openaiModelTemperature);
    this.openaiConcurrencyLimit = parseInt(params.openaiConcurrencyLimit);
    this.githubConcurrencyLimit = parseInt(params.githubConcurrencyLimit);
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
