# Architecture

## System diagram

```
                    ┌──────────────────┐
                    │      React       │
                    │    Frontend      │
                    └────────┬─────────┘
                             │ REST API
                    ┌────────▼─────────┐
                    │    Express.js    │
                    │   API Gateway    │
                    └────────┬─────────┘
              ┌──────────────┼──────────────┐
        ┌─────▼─────┐  ┌────▼────┐   ┌─────▼─────┐
        │  MongoDB  │  │Cloudinary│   │ AI Layer  │
        └───────────┘  └──────────┘   └────────────┘
                             │
                       Media Pipeline
                             │
                    ┌────────▼────────┐
                    │  AI Processing  │
                    │ Vision + LLM    │
                    └─────────────────┘
```

## Cloudinary folder structure

```
impactlens/
  projects/
    <project-id>/
      before/
      after/
      field-evidence/
      reports/
```

## MongoDB collections

### users
`_id, name, email, passwordHash, role, createdAt`

### projects
`_id, name, description, organization, category, location, startDate, endDate, status, createdBy, createdAt`

### mediaAssets
```
_id
projectId
cloudinaryPublicId
secureUrl
resourceType
originalFilename
captureDate
location
tags
objects
activities
environmentalSignals
aiDescription
aiSummary
aiConfidence
processingStatus        # PENDING | PROCESSING | COMPLETED | FAILED
originalAssetId
transformations
createdAt
```

### analyses
`_id, projectId, mediaIds, analysisType, result, confidence, model, createdAt`

### reports
`_id, projectId, title, content, mediaIds, generatedBy, publicSlug, createdAt`

## AI metadata schema

```js
{
  description: String,
  tags: [String],
  objects: [{ name: String, confidence: Number }],
  activities: [{ name: String, confidence: Number }],
  environmentalSignals: [{ name: String, confidence: Number }],
  aiSummary: String,
  analyzedAt: Date,
  model: String
}
```

## Traceability model

```
originalAsset → Cloudinary transformation → derivedAsset → AI analysis → insight → report
```

Every insight shown in the product must be able to answer: *which media, which project,
which AI model/version, which timestamp?*

## AI trust principle — Observed / Inferred / Claimed

- **Observed:** "AI detected approximately 15 people." (direct model output)
- **Inferred:** "The scene appears consistent with a community plantation activity." (interpretation)
- **Claimed:** "The organization reports that 500 trees were planted." (external, human-provided claim)

The UI must never present an AI interpretation as a verified real-world fact. Confidence scores
are displayed as *AI confidence*, not proof an event occurred.

## Timeline intelligence (target shape)

```
JAN
├── Plantation
├── Site preparation
FEB
├── Irrigation
MAR
├── New saplings
JUN
└── Vegetation growth
```

## Dashboard UI — nav structure

```
ImpactLens
  Dashboard
  Projects
  Media Intelligence
  Evidence Explorer
  Timeline
  Comparisons
  AI Insights
  Reports
  ────────
  Settings
```
