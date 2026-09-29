const { config } = require('../../config/env');
const MockProvider = require('./MockProvider');
function createProvider() {
  let provider;
  if (config.aiProvider === 'gemini') {
    const Provider = require('./GeminiProvider');
    provider = new Provider();
  } else if (config.aiProvider === 'groq') {
    const Provider = require('./GroqProvider');
    provider = new Provider();
  } else if (config.aiProvider === 'openai') {
    const Provider = require('./OpenAIProvider');
    provider = new Provider();
  } else return new MockProvider();
  const fallback = new MockProvider();
  for (const method of [
    'compareImages',
    'generateSummary',
    'generateReport',
    'generateEmbedding',
    'understandQuery',
  ])
    if (!provider[method]) provider[method] = fallback[method].bind(fallback);
  return provider;
}
module.exports = { createProvider };
