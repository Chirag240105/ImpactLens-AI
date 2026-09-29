const OpenAI = require('openai');
const { config } = require('../../config/env');
class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.aiApiKey,
      timeout: 20000,
      baseURL: config.legacy.openRouterApiKey ? 'https://openrouter.ai/api/v1' : undefined,
    });
    this.model = config.aiModel || 'gpt-4o-mini';
  }
  async analyzeImage({ imageUrl, filename }) {
    const r = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze field evidence. Return JSON metadata and separate observed facts from inferences. Filename: ${filename || ''}`,
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });
    return JSON.parse(r.choices[0].message.content);
  }
}
module.exports = OpenAIProvider;
