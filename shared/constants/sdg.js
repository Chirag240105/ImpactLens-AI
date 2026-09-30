/**
 * UN Sustainable Development Goals and the evidence terms that align media with them.
 * Matching is transparent keyword rules over AI-detected activities, signals, objects and tags,
 * so every alignment can be explained ("matched: saplings, plantation"). Alignment means the
 * evidence shows related activity; it does not claim a measured contribution to the goal.
 */
exports.SDG_GOALS = Object.freeze({
  3: 'Good Health and Well-being',
  4: 'Quality Education',
  5: 'Gender Equality',
  6: 'Clean Water and Sanitation',
  11: 'Sustainable Cities and Communities',
  12: 'Responsible Consumption and Production',
  13: 'Climate Action',
  14: 'Life Below Water',
  15: 'Life on Land',
  17: 'Partnerships for the Goals',
});

exports.SDG_RULES = Object.freeze([
  {
    goal: 6,
    terms: [
      'water',
      'river',
      'wetland',
      'lake',
      'drain',
      'sewage',
      'sanitation',
      'toilet',
      'handwash',
      'water body',
    ],
  },
  {
    goal: 11,
    terms: [
      'cleaning',
      'street',
      'urban',
      'city',
      'public space',
      'waste collection',
      'garbage',
      'community participation',
      'infrastructure',
      'sanitation',
      'bins',
    ],
  },
  {
    goal: 12,
    terms: [
      'waste management',
      'waste segregation',
      'segregation',
      'recycling',
      'recycle',
      'compost',
      'plastic',
      'litter',
      'bins',
    ],
  },
  {
    goal: 13,
    terms: [
      'plantation',
      'tree planting',
      'saplings',
      'sapling',
      'afforestation',
      'climate',
      'restoration',
      'solar',
    ],
  },
  {
    goal: 14,
    terms: [
      'aquatic',
      'floating waste',
      'plastic waste',
      'river pollution',
      'water pollution',
      'marine',
      'fish',
    ],
  },
  {
    goal: 15,
    terms: [
      'plantation',
      'tree',
      'saplings',
      'sapling',
      'vegetation',
      'forest',
      'biodiversity',
      'birds',
      'wildlife',
      'soil',
      'erosion',
      'restoration',
      'wetland',
      'sanctuary',
    ],
  },
  {
    goal: 3,
    terms: ['sanitation', 'hygiene', 'health', 'air', 'clean air', 'medical'],
  },
  {
    goal: 4,
    terms: ['awareness', 'school', 'students', 'education', 'training', 'workshop', 'pledge'],
  },
  { goal: 5, terms: ['women', 'woman', 'girls', 'women-led'] },
  {
    goal: 17,
    terms: ['partnership', 'corporate', 'government', 'municipal', 'ngo'],
  },
]);
