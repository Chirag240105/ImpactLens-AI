const OpenAI = require('openai');
const { config } = require('../../config/env');
class GroqProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.aiApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 20000,
    });
    this.model = config.aiModel || 'llama-3.2-11b-vision-preview';
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
module.exports = GroqProvider;
