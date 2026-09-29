const AIProvider = require('./AIProvider');
class MockProvider extends AIProvider {
  async analyzeImage({ filename = 'field evidence' } = {}) {
    const name = filename.toLowerCase();
    const activity = /tree|plant|sapling/.test(name)
      ? 'Plantation'
      : /clean|waste/.test(name)
        ? 'Cleaning'
        : /follow/.test(name)
          ? 'Follow-up'
          : 'Community Participation';
    return {
      description: `Field evidence showing ${activity.toLowerCase()} activity.`,
      tags: [activity.toLowerCase(), 'field evidence'],
      objects: [{ name: 'people', confidence: 0.82 }],
      activities: [{ name: activity, confidence: 0.78 }],
      environmentalSignals: [{ name: 'vegetation', confidence: 0.7 }],
      aiSummary: `AI-detected ${activity.toLowerCase()} evidence; verify against project records.`,
      aiConfidence: 0.76,
      observedInferred: {
        observed: ['People and outdoor field activity are visible.'],
        inferred: [`The activity may be related to ${activity.toLowerCase()}.`],
      },
      analyzedAt: new Date(),
      model: 'impactlens-mock-v1',
    };
  }
  async compareImages() {
    return {
      visualChangeScore: 0.62,
      observedChanges: ['The visible scene differs between the selected captures.'],
      inferredNotes: ['The images may show different project stages.'],
      confidence: 0.62,
    };
  }
  async generateSummary({ project }) {
    return `Impact story for ${project.name}, grounded in uploaded visual evidence.`;
  }
  async generateCampaign({ project }) {
    return {
      socialCaption: `Evidence from ${project.name}: documented field activity, traceable to source media.`,
      websiteStory: `Impact story for ${project.name}, grounded in uploaded visual evidence.`,
      executiveSummary: `${project.name} — visual evidence summary.`,
      presentationSummary: `${project.name}: project evidence and gaps.`,
    };
  }
  async generateReport({ project, sections = [] }) {
    return { title: `${project.name} impact evidence`, sections };
  }
  async generateEmbedding() {
    return [];
  }
  async understandQuery(query) {
    return {
      activities: [],
      objects: [],
      signals: [],
      location: '',
      keywords: String(query || '')
        .split(/\s+/)
        .filter(Boolean),
    };
  }
}
module.exports = MockProvider;
