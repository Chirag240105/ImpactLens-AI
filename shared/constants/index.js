exports.ROLES = Object.freeze(["ADMIN", "PROJECT_MANAGER", "VIEWER"]);
exports.PROJECT_STATUS = Object.freeze([
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);
exports.EVIDENCE_TYPES = Object.freeze([
  "BEFORE",
  "AFTER",
  "FIELD_EVIDENCE",
  "FOLLOW_UP",
  "OTHER",
]);
exports.PROCESSING_STATUS = Object.freeze([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
exports.ANALYSIS_TYPES = Object.freeze([
  "COMPARE",
  "PAIR_SUGGESTION",
  "COVERAGE",
  "GAP",
  "TIMELINE",
  "INSIGHT",
]);
exports.LOCATION_SOURCES = Object.freeze([
  "GPS_VERIFIED",
  "USER_PROVIDED",
  "AI_ESTIMATED",
  "UNKNOWN",
]);
exports.DEFAULT_CATEGORIES = Object.freeze([
  "Site Preparation",
  "Cleaning",
  "Plantation",
  "Community Participation",
  "Infrastructure",
  "Restoration",
  "Follow-up",
]);
