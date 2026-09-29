process.env.GEMINI_RPM = '6000';
process.env.AI_PROVIDER = 'gemini';
process.env.AI_API_KEY = 'test-key';

let mockReply;
let mockCalls = 0;
jest.mock('@google/generative-ai', () => ({
  SchemaType: new Proxy({}, { get: (_t, k) => String(k) }),
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }) {
      return {
        generateContent: async () => {
          mockCalls++;
          const r = typeof mockReply === 'function' ? mockReply(model, mockCalls) : mockReply;
          if (r instanceof Error) throw r;
          return { response: { text: () => JSON.stringify(r) } };
        },
      };
    }
  },
}));

const GeminiProvider = require('../services/ai/GeminiProvider');
const image = { data: Buffer.from('fake'), mimeType: 'image/jpeg' };

beforeEach(() => {
  mockCalls = 0;
});

describe('GeminiProvider', () => {
  test('normalises output: caps confidence, lowercases tags, maps observed/inferred', async () => {
    mockReply = {
      isFieldEvidence: true,
      description: 'Volunteers plant saplings.',
      tags: ['Plantation', 'plantation', 'Volunteers'],
      objects: [{ name: 'saplings', confidence: 1 }],
      activities: [{ name: 'Plantation', confidence: 1.4 }],
      environmentalSignals: [{ name: 'vegetation', confidence: 0.7 }],
      observed: ['People hold saplings.'],
      inferred: ['This may be a community drive.'],
      aiSummary: 'Tree planting.',
      aiConfidence: 1,
    };
    const r = await new GeminiProvider().analyzeImage({ image });
    expect(r.activities[0]).toEqual({ name: 'Plantation', confidence: 0.95 });
    expect(r.aiConfidence).toBe(0.95);
    expect(r.tags).toEqual(['plantation', 'volunteers']);
    expect(r.observedInferred).toEqual({
      observed: ['People hold saplings.'],
      inferred: ['This may be a community drive.'],
    });
    expect(r.model).toBe('gemini-2.5-flash');
  });

  test('images that are not field evidence get no activities', async () => {
    mockReply = {
      isFieldEvidence: false,
      description: 'A screenshot of a spreadsheet.',
      tags: [],
      objects: [],
      activities: [{ name: 'Cleaning', confidence: 0.4 }],
      environmentalSignals: [],
      observed: [],
      inferred: [],
      aiSummary: 'Not field evidence.',
      aiConfidence: 0.3,
    };
    const r = await new GeminiProvider().analyzeImage({ image });
    expect(r.isFieldEvidence).toBe(false);
    expect(r.activities).toEqual([]);
  });

  test('falls back to a lighter model when the preferred one is overloaded', async () => {
    const overloaded = Object.assign(new Error('[503 Service Unavailable] high demand'), {
      status: 503,
    });
    mockReply = (model) =>
      model === 'gemini-2.5-flash'
        ? overloaded
        : {
            isFieldEvidence: true,
            description: 'ok',
            tags: [],
            objects: [],
            activities: [],
            environmentalSignals: [],
            observed: [],
            inferred: [],
            aiSummary: 'ok',
            aiConfidence: 0.5,
          };
    const r = await new GeminiProvider().analyzeImage({ image });
    expect(r.model).toBe('gemini-3.5-flash');
  }, 20000);

  test('marks exhausted rate limits as transient so the job can retry later', async () => {
    mockReply = Object.assign(new Error('[429 Too Many Requests] retry in 0.01s'), { status: 429 });
    await expect(new GeminiProvider().analyzeImage({ image })).rejects.toMatchObject({
      transient: true,
    });
  }, 20000);

  test('a daily quota parks that model and moves on without waiting', async () => {
    const capped = Object.assign(
      new Error(
        '[429 Too Many Requests] quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      ),
      { status: 429 },
    );
    const ok = {
      isFieldEvidence: true,
      description: 'ok',
      tags: [],
      objects: [],
      activities: [],
      environmentalSignals: [],
      observed: [],
      inferred: [],
      aiSummary: 'ok',
      aiConfidence: 0.5,
    };
    mockReply = (model) => (model === 'gemini-3.5-flash' ? ok : capped);
    const started = Date.now();
    const r = await new GeminiProvider().analyzeImage({ image });
    expect(r.model).toBe('gemini-3.5-flash');
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test('when every model is capped for the day it fails clearly, not transiently', async () => {
    mockReply = Object.assign(
      new Error('[429] GenerateRequestsPerDayPerProjectPerModel-FreeTier'),
      {
        status: 429,
      },
    );
    await expect(new GeminiProvider().analyzeImage({ image })).rejects.toMatchObject({
      quotaExhausted: true,
      transient: false,
    });
  });
});
