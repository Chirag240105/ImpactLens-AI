# Demo Script

## Demo dataset

**"Yamuna Urban Restoration Initiative"**

- 50–100 images, 5–10 videos
- Categories: Site Preparation, Cleaning, Plantation, Community Participation, Restoration, Follow-up
- Locations: Delhi, Noida, Ghaziabad
- Timeline: January → June
- Must include intentional before/after pairs and real capture-date spread

Seed script: `server/utils/seedDemoData.js` (owner: Atharv).

## The judge-facing walkthrough

1. **Open a messy project** — "127 media assets," nothing organized yet.
2. **Click "Analyze Project."** AI processes the collection.
3. **Dashboard auto-populates:** 8 activities, 5 locations, 127 assets, 23 environmental
   signals, 12 potential before/after pairs.
4. **Ask:** "Show evidence of community participation." Platform filters instantly.
5. **Open one image.** Show: people detected, activity, AI confidence, source Cloudinary ID,
   timestamp, location.
6. **Go to Before/After.** Show the slider, then the AI-detected visual changes panel.
7. **Click "Generate Impact Story."** Report builds from actual project evidence.
8. **Open Evidence Trace.** Claim → evidence → original Cloudinary asset → AI analysis → timestamp.
9. **Show the evidence-gap warning** ("follow-up evidence is limited... capture more in 60–90 days").
10. **Click "Generate Report."** Show the final polished output.

## Success criteria

A judge should be able to do this end-to-end with **no developer help**:

```
Login → Create project → Upload media → AI analysis → View AI metadata → Search naturally
  → Open evidence → Compare before/after → View timeline → See evidence trace
  → Generate impact story → Generate report → Open public report
```

## Anticipated judge questions

- **"What makes this different from Google Drive?"** — Drive stores media; ImpactLens
  understands it, links it to projects/timelines, enables semantic discovery, compares
  changes, and generates traceable reports.
- **"Why Cloudinary?"** — It's the media infrastructure (upload, transform, optimize,
  deliver); we build the intelligence layer on top.
- **"Can AI hallucinate?"** — Yes — that's why every insight stays traceable to source
  media and confidence is shown as confidence, not proof.
- **"How do you verify impact?"** — The platform surfaces visual evidence and change; it
  doesn't claim visual AI alone proves real-world impact.
- **"Can this scale?"** — Cloudinary handles media, MongoDB handles metadata, AI processing
  is async/queued so it scales independently.
- **"What happens with video?"** — Processed via Cloudinary, analyzed via selected frames /
  multimodal AI, same evidence pipeline applies.
