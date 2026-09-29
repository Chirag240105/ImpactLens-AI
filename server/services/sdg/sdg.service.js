const Media = require('../../models/MediaAsset');
const { SDG_GOALS, SDG_RULES } = require('../../../shared/constants/sdg');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = SDG_RULES.map((r) => ({
  goal: r.goal,
  patterns: r.terms.map((t) => ({ term: t, re: new RegExp(`\\b${escape(t)}\\b`, 'i') })),
}));

/** Terms an asset's AI analysis offers for matching (activities, signals, objects, tags). */
const vocabulary = (a) =>
  [
    ...(a.activities || []).filter((x) => (x.confidence ?? 1) >= 0.5).map((x) => x.name),
    ...(a.environmentalSignals || []).filter((x) => (x.confidence ?? 1) >= 0.5).map((x) => x.name),
    ...(a.objects || []).filter((x) => (x.confidence ?? 1) >= 0.5).map((x) => x.name),
    ...(a.tags || []),
  ].map((s) => String(s).toLowerCase());

/** SDGs an asset's evidence aligns with, each with the terms that matched. */
function assetSdgs(a) {
  const words = vocabulary(a);
  if (!words.length || (a.tags || []).includes('not-field-evidence')) return [];
  const out = [];
  for (const rule of RULES) {
    const matched = [
      ...new Set(rule.patterns.filter((p) => words.some((w) => p.re.test(w))).map((p) => p.term)),
    ];
    if (matched.length) out.push({ goal: rule.goal, name: SDG_GOALS[rule.goal], matched });
  }
  return out;
}

/** Per-goal evidence counts for a project, strongest alignment first. */
async function projectSdgs(projectId) {
  const assets = await Media.find({ projectId, processingStatus: 'COMPLETED' })
    .select('activities environmentalSignals objects tags')
    .lean();
  const byGoal = new Map();
  for (const a of assets)
    for (const s of assetSdgs(a)) {
      const g = byGoal.get(s.goal) || {
        goal: s.goal,
        name: s.name,
        assets: 0,
        terms: {},
        sampleMediaIds: [],
      };
      g.assets++;
      s.matched.forEach((t) => (g.terms[t] = (g.terms[t] || 0) + 1));
      if (g.sampleMediaIds.length < 6) g.sampleMediaIds.push(a._id);
      byGoal.set(s.goal, g);
    }
  return [...byGoal.values()]
    .map((g) => ({
      ...g,
      share: assets.length ? Math.round((g.assets / assets.length) * 100) : 0,
      topTerms: Object.entries(g.terms)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 4)
        .map(([t]) => t),
      terms: undefined,
    }))
    .sort((x, y) => y.assets - x.assets);
}

module.exports = { assetSdgs, projectSdgs };
