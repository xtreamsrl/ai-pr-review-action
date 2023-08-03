import { createOpenAILanguageModel } from 'typechat/dist/model';
import fs from 'fs';
import path from 'node:path';
import { createJsonTranslator } from 'typechat';
import { CommentArraySchema } from './commentArraySchema';
import { SingleDiffPrompt } from './prompts';

(async () => {
  const files = [
    {
      sha: "6e1cce2406df834c954791070bca097954d802bb",
      filename: "src/options.ts",
      status: "modified",
      additions: 4,
      deletions: 4,
      changes: 8,
      blob_url: "https://github.com/xtreamsrl/ai-pr-review-action/blob/5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265/src%2Foptions.ts",
      raw_url: "https://github.com/xtreamsrl/ai-pr-review-action/raw/5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265/src%2Foptions.ts",
      contents_url: "https://api.github.com/repos/xtreamsrl/ai-pr-review-action/contents/src%2Foptions.ts?ref=5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265",
      patch: "@@ -3,16 +3,16 @@ export const SUPPORTED_ACTIONS = ['opened', 'labeled'];\n export const SUPPORTED_FILE_EXTENSIONS = ['.js', '.ts', '.py', '.java'];\n \n export class Options {\n-  openaiApiKey: string;\n-  openaiApiBaseUrl: string;\n+  openai_Api_Key: string;\n+  openai_Api_BaseUrl: string;\n   openaiModel: 'gpt-4' | 'gpt-3.5-turbo';\n \n   constructor(params: {\n     openaiApiBaseUrl: string;\n     openaiModel: string;\n   }) {\n-    this.openaiApiKey = process.env.OPENAI_API_KEY!;\n-    this.openaiApiBaseUrl = params.openaiApiBaseUrl;\n+    this.openai_Api_Key = process.env.OPENAI_API_KEY!;\n+    this.openai_Api_BaseUrl = params.openaiApiBaseUrl;\n     this.openaiModel = Options.parseGptModel(params.openaiModel);\n   }\n "
    },
    {
      sha: "b97d317b6844942014fe8f7c95a5823af6c62b0d",
      filename: "src/reviewer.ts",
      status: "modified",
      additions: 1,
      deletions: 1,
      changes: 2,
      blob_url: "https://github.com/xtreamsrl/ai-pr-review-action/blob/5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265/src%2Freviewer.ts",
      raw_url: "https://github.com/xtreamsrl/ai-pr-review-action/raw/5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265/src%2Freviewer.ts",
      contents_url: "https://api.github.com/repos/xtreamsrl/ai-pr-review-action/contents/src%2Freviewer.ts?ref=5d838b6ef03d3bb8fa486ec47b8eb2f3d9d96265",
      patch: "@@ -30,7 +30,7 @@ export class Reviewer {\n \n   constructor(options: Options) {\n     this.options = options;\n-    const model = createOpenAILanguageModel(options.openaiApiKey, options.openaiModel);\n+    const model = createOpenAILanguageModel(options.openai_Api_Key, options.openaiModel);\n     const schema = fs.readFileSync(path.join(__dirname, 'commentSchema.ts'), 'utf8');\n     this.translator = createJsonTranslator<CommentSchema>(model, schema, 'CommentSchema');\n   }"
    }
  ]
  const model = createOpenAILanguageModel(process.env.OPENAI_API_KEY!, 'gpt-4');
  const schema = fs.readFileSync(path.join(__dirname, 'commentArraySchema.ts'), 'utf8');
  const translator = createJsonTranslator<CommentArraySchema>(model, schema, 'CommentArraySchema');
  const multiFileDiff = files.map(file => file.patch).join('\n---\n');
  const promptRequest = new SingleDiffPrompt().build({diff: multiFileDiff});
  const comments = await translator.translate(promptRequest);
  console.log(comments);
})();
