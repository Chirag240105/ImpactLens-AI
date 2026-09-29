exports.projectFolder = (projectId, evidenceType = 'field-evidence') =>
  `impactlens/projects/${projectId}/${String(evidenceType).toLowerCase().replaceAll('_', '-')}`;
