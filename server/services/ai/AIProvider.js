/** Provider contract for deterministic, replaceable media intelligence adapters. */
class AIProvider {
  async analyzeImage() {
    throw new Error('analyzeImage must be implemented');
  }
  async compareImages() {
    throw new Error('compareImages must be implemented');
  }
  async generateSummary() {
    throw new Error('generateSummary must be implemented');
  }
  async understandQuery() {
    throw new Error('understandQuery must be implemented');
  }
}
module.exports = AIProvider;
