const { config } = require('../../config/env');
class GeminiProvider {
  constructor() {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    this.model = new GoogleGenerativeAI(config.aiApiKey).getGenerativeModel({
      model: config.aiModel || 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
  }
  async analyzeImage({ imageUrl, filename }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let part;
    try {
      const r = await fetch(imageUrl, { signal: controller.signal });
      if (!r.ok) throw new Error('Image fetch failed');
      part = {
        inlineData: {
          data: Buffer.from(await r.arrayBuffer()).toString('base64'),
          mimeType: r.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
        },
      };
    } finally {
      clearTimeout(timeout);
    }
    const out = await this.model.generateContent([
      {
        text: `Return valid JSON metadata with description,tags,objects,activities,environmentalSignals,aiSummary,aiConfidence,observedInferred. Separate observed and inferred. Filename: ${filename || ''}`,
      },
      part,
    ]);
    return JSON.parse(out.response.text());
  }
}
module.exports = GeminiProvider;
