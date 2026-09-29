# DESIGN.md — ImpactLens

> A calm field ledger: evidence first, AI second, every claim one click from its source.

Source of truth for the ImpactLens client (`client/`). Tokens below are implemented verbatim in
`client/src/styles/tokens.css`, and Tailwind v4 utilities are mapped onto them in
`client/src/styles/index.css`. Code must reference tokens, never raw hex values.

## 1. Visual Theme & Atmosphere

**Style**: Field Ledger. Organic Natural (moss green, warm neutrals) crossed with Minimal Pure (dense, quiet, grid-led).
**Keywords**: evidence, calm, traceable, grounded, legible, honest, field-tested
**Tone**: a trustworthy working tool for NGO program managers and auditors. NOT neon, NOT "AI magic", NOT a generic purple-gradient dashboard.
**Feel**: a well-kept field notebook with a sharp index: photos are the heroes, and the AI is a careful assistant that shows its work.

**Interaction Tier**: L1 (refined static) in the app. L2 (gentle scroll reveal) on the public report page only.
**Dependencies**: CSS only. Transitions and keyframes handle drawers, dialogs and reveals; count-ups use a tiny rAF + IntersectionObserver helper (no GSAP, no Lenis, no animation library).

**Product-specific visual language (non-negotiable):**
- **Trust kinds**: *Observed* (what the AI saw) uses the blue `--observed` token; *Inferred* (its interpretation) uses violet `--inferred`; *Claimed* (human project records) uses neutral ink `--claimed`. They are always labelled in words, never by colour alone.
- **Location source**: GPS Verified is a solid green badge; User Provided is blue; AI Estimated is amber with a **dashed** border (visually "soft"); Unknown is grey.
- **Confidence** is always written as "AI confidence 78%" with a thin meter. Never a checkmark, never "verified".
- **Comparisons** are always titled "AI-detected visual difference".

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #f6f7f4;              /* app canvas */
  --surface: #ffffff;         /* cards, tables, drawers */
  --surface-alt: #f0f3ee;     /* table header, inset panels, skeleton base */
  --surface-hover: #f3f6f1;   /* row / item hover */
  --surface-sunken: #e9ede7;  /* input track, progress track */

  /* Borders */
  --border: #e3e8e2;
  --border-hover: #cbd5cc;
  --border-strong: #b7c3b9;

  /* Text (all pass WCAG AA on --surface and --bg) */
  --text: #1f2d25;            /* titles, primary values — 13.9:1 */
  --text-secondary: #4d5c53;  /* body copy — 7.0:1 */
  --text-tertiary: #5f6b63;   /* labels, meta — 5.3:1 (4.9:1 on --surface-alt) */
  --text-inverse: #ffffff;

  /* Accent — ImpactLens moss */
  --accent: #267953;          /* CTA, links, active nav — 5.4:1 on white */
  --accent-hover: #1f6644;
  --accent-active: #185236;
  --accent-soft: #e8f3ec;     /* active nav bg, selected chip */
  --accent-soft-hover: #dcede2;
  --focus-ring: #2f8f63;

  /* RGB helpers for rgba() */
  --bg-rgb: 246, 247, 244;
  --text-rgb: 31, 45, 37;
  --accent-rgb: 38, 121, 83;

  /* Semantic */
  --success: #276b43;   --success-soft: #e7f3ea;
  --warning: #865209;   --warning-soft: #fbf1e1;
  --error: #b3261e;     --error-soft: #fbeaea;
  --info: #285f80;      --info-soft: #e8f1f7;

  /* Trust kinds */
  --observed: #285f80;  --observed-soft: #e8f1f7;
  --inferred: #5c4a96;  --inferred-soft: #f1eef9;
  --claimed: #3b4a41;   --claimed-soft: #eef1ee;

  /* Data visualisation (categorical, muted, distinguishable) */
  --viz-1: #267953; --viz-2: #5f8fb0; --viz-3: #c08a3e;
  --viz-4: #8a76b8; --viz-5: #4f9c9a; --viz-6: #b56b5b;

  /* Overlay */
  --scrim: rgba(var(--text-rgb), 0.42);
}

/* Dark theme: same roles, re-tuned for contrast */
:root[data-theme="dark"] {
  --bg: #111714; --surface: #18201b; --surface-alt: #1e2721; --surface-hover: #212b25;
  --surface-sunken: #0d120f;
  --border: #2a352e; --border-hover: #3a473f; --border-strong: #4a584f;
  --text: #e8eee9; --text-secondary: #b9c5bc; --text-tertiary: #8e9b92; --text-inverse: #0f1411;
  --accent: #4fb483; --accent-hover: #63c493; --accent-active: #3f9d70;
  --accent-soft: #1d3327; --accent-soft-hover: #234031; --focus-ring: #63c493;
  --bg-rgb: 17, 23, 20; --text-rgb: 232, 238, 233; --accent-rgb: 79, 180, 131;
  --success: #5cbf85; --success-soft: #1c3326;
  --warning: #e0a44d; --warning-soft: #3a2c15;
  --error: #ef7b73; --error-soft: #3b1d1b;
  --info: #72a9cf; --info-soft: #172a37;
  --observed: #72a9cf; --observed-soft: #172a37;
  --inferred: #a898dc; --inferred-soft: #272238;
  --claimed: #c3cec6; --claimed-soft: #232b26;
  --scrim: rgba(0, 0, 0, 0.6);
}
```

**Color Rules:**
- Every colour in code comes from a token. No hex, rgb() or named colours in components.
- Moss `--accent` is the only brand colour. One primary CTA per view.
- Semantic colours carry meaning (status, trust, source), never decoration.
- Colour never carries meaning alone. Every badge has a text label, and AI Estimated also has a dashed border.
- Photos provide the visual richness. The UI chrome stays neutral.

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
--font-display: 'Manrope', ui-sans-serif, system-ui, sans-serif;
--font-body: 'DM Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace;
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Public report H1 | Manrope | clamp(2rem, 4vw, 3rem) | 800 | 1.1 | -0.03em |
| Page title (H1) | Manrope | 1.5rem | 700 | 1.25 | -0.02em |
| Section H2 | Manrope | 1.0625rem | 700 | 1.35 | -0.01em |
| H3 / card title | DM Sans | 0.9375rem | 600 | 1.4 | — |
| KPI number | Manrope | 1.75rem | 700 | 1.1 | -0.02em, tabular-nums |
| Body | DM Sans | 0.875rem | 400 | 1.55 | — |
| Small / meta | DM Sans | 0.8125rem | 400–500 | 1.45 | — |
| Label / eyebrow | DM Sans | 0.6875rem | 600 | 1.3 | 0.08em, uppercase |
| Mono (IDs, models) | JetBrains Mono | 0.75rem | 400 | 1.45 | — |

**Typography Rules:**
- The minimum rendered size is 11px (labels only). Body copy is never below 13px. The old mockup's 8–10px text is retired.
- Headings use Manrope at 600–800. Body copy and UI controls use DM Sans.
- Numbers in tables and KPIs use `font-variant-numeric: tabular-nums`.
- Cloudinary public IDs, model names and hashes use mono and are truncated with a copy button.
- **NEVER use**: Inter-as-default, Poppins, Montserrat, or any display script.

**Text Decoration** (text-decoration-rules decision table, calm style):
- H1/H2: no gradient, no shadow.
- Eyebrows: uppercase `--text-tertiary`, no underline.
- Links: colour transition plus an underline with 3px offset on hover.

## 4. Component Stylings

### Buttons
```css
.btn { display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  height:2.25rem; padding:0 .875rem; border-radius:var(--radius-md); border:1px solid transparent;
  font:600 .8125rem/1 var(--font-body); cursor:pointer;
  transition:background-color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
             color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.btn:focus-visible { outline:2px solid var(--focus-ring); outline-offset:2px; }
.btn:active:not(:disabled) { transform:translateY(1px); }
.btn:disabled, .btn[aria-disabled="true"] { opacity:.5; cursor:not-allowed; }

.btn-primary { background:var(--accent); color:var(--text-inverse); box-shadow:var(--shadow-xs); }
.btn-primary:hover:not(:disabled) { background:var(--accent-hover); }
.btn-primary:active:not(:disabled) { background:var(--accent-active); }

.btn-secondary { background:var(--surface); color:var(--text); border-color:var(--border); }
.btn-secondary:hover:not(:disabled) { background:var(--surface-hover); border-color:var(--border-hover); }

.btn-ghost { background:transparent; color:var(--text-secondary); }
.btn-ghost:hover:not(:disabled) { background:var(--surface-hover); color:var(--text); }

.btn-danger { background:var(--surface); color:var(--error); border-color:var(--border); }
.btn-danger:hover:not(:disabled) { background:var(--error-soft); border-color:var(--error); }

.btn-sm { height:2rem; padding:0 .625rem; }   .btn-lg { height:2.75rem; padding:0 1.125rem; font-size:.875rem; }
.btn-loading { position:relative; color:transparent !important; }  /* spinner overlays label */
```

### Cards
```css
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); }
.card-interactive { transition:border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); }
.card-interactive:hover { border-color:var(--border-hover); box-shadow:var(--shadow-sm); }
.card-interactive:focus-visible { outline:2px solid var(--focus-ring); outline-offset:2px; }
/* Dashboard rule: data cards highlight their border on hover, they never lift. */
```

### Media card (evidence grid)
```css
.media-card { overflow:hidden; border-radius:var(--radius-lg); border:1px solid var(--border); background:var(--surface); }
.media-card img { aspect-ratio:3/2; width:100%; object-fit:cover; background:var(--surface-alt);
  transition:transform var(--dur-slow) var(--ease); }
.media-card:hover img { transform:scale(1.03); }
.media-card[aria-selected="true"] { border-color:var(--accent); box-shadow:0 0 0 3px rgba(var(--accent-rgb), .18); }
```

### Navigation (sidebar)
```css
.nav-item { display:flex; align-items:center; gap:.625rem; height:2.25rem; padding:0 .75rem;
  border-radius:var(--radius-md); color:var(--text-secondary); font:500 .8125rem var(--font-body); }
.nav-item:hover { background:var(--surface-hover); color:var(--text); }
.nav-item[aria-current="page"] { background:var(--accent-soft); color:var(--accent); font-weight:600; }
.nav-item:focus-visible { outline:2px solid var(--focus-ring); outline-offset:-2px; }
```

### Links
```css
.link { color:var(--accent); font-weight:600; text-decoration:none; text-underline-offset:3px;
  transition:color var(--dur-fast) var(--ease); }
.link:hover { color:var(--accent-hover); text-decoration:underline; }
.link:focus-visible { outline:2px solid var(--focus-ring); outline-offset:2px; border-radius:2px; }
```

### Tags / Badges
```css
.badge { display:inline-flex; align-items:center; gap:.375rem; height:1.375rem; padding:0 .5rem;
  border-radius:var(--radius-pill); font:600 .6875rem/1 var(--font-body); border:1px solid transparent; }
.badge-neutral  { background:var(--surface-alt);  color:var(--text-secondary); }
.badge-success  { background:var(--success-soft); color:var(--success); }
.badge-warning  { background:var(--warning-soft); color:var(--warning); }
.badge-error    { background:var(--error-soft);   color:var(--error); }
.badge-info     { background:var(--info-soft);    color:var(--info); }
.badge-estimated{ background:var(--warning-soft); color:var(--warning); border:1px dashed currentColor; }
.badge-observed { background:var(--observed-soft); color:var(--observed); }
.badge-inferred { background:var(--inferred-soft); color:var(--inferred); }
.badge-claimed  { background:var(--claimed-soft);  color:var(--claimed); }
```

### Inputs
```css
.input { height:2.25rem; width:100%; padding:0 .75rem; border-radius:var(--radius-md);
  border:1px solid var(--border); background:var(--surface); color:var(--text); font:400 .875rem var(--font-body);
  transition:border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); }
.input::placeholder { color:var(--text-tertiary); }
.input:hover { border-color:var(--border-hover); }
.input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px rgba(var(--accent-rgb), .16); }
.input[aria-invalid="true"] { border-color:var(--error); }
.input:disabled { background:var(--surface-alt); color:var(--text-tertiary); cursor:not-allowed; }
```

### Filter chips
```css
.chip { height:2rem; padding:0 .75rem; border-radius:var(--radius-pill); border:1px solid var(--border);
  background:var(--surface); color:var(--text-secondary); font:500 .8125rem var(--font-body); }
.chip:hover { border-color:var(--border-hover); color:var(--text); }
.chip[aria-pressed="true"] { background:var(--accent-soft); border-color:var(--accent); color:var(--accent); }
.chip:focus-visible { outline:2px solid var(--focus-ring); outline-offset:2px; }
```

### Confidence meter
```css
.meter { height:4px; border-radius:var(--radius-pill); background:var(--surface-sunken); overflow:hidden; }
.meter > span { display:block; height:100%; background:var(--accent); border-radius:inherit; }
/* <50% uses --warning; the label always reads "AI confidence NN%". */
```

### Skeleton / Empty / Error states
```css
.skeleton { background:linear-gradient(90deg, var(--surface-alt) 0%, var(--surface-hover) 50%, var(--surface-alt) 100%);
  background-size:200% 100%; animation:shimmer 1.4s var(--ease) infinite; border-radius:var(--radius-md); }
/* Empty: icon in a 40px soft circle + title + one sentence + one action. Error: same layout, --error icon, a "Try again" action. */
```

## 5. Layout Principles

**Container:**
- App shell: fixed sidebar of 248px, and a content area with max width 1320px and padding `2rem` (1.25rem on mobile).
- Narrow variant (report reading, forms): 760px.

**Spacing Scale** (4px base): 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64
- Page sections: 32px apart. Card grid gap: 16px. Card padding: 20px (16px on mobile).

**Grid:**
```css
.kpi-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); }
.media-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); }
.split { display:grid; gap:1rem; grid-template-columns:minmax(0, 1.6fr) minmax(0, 1fr); }
```

**Radius:** `--radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-pill: 999px`

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | border `--border`, no shadow | cards, tables, panels (default) |
| XS | `0 1px 2px rgba(var(--text-rgb), .06)` | primary buttons, inputs on focus |
| SM | `0 2px 8px -2px rgba(var(--text-rgb), .10)` | hovered interactive cards, popovers |
| MD | `0 12px 32px -8px rgba(var(--text-rgb), .18)` | dropdowns, command palette, toasts |
| LG | `0 24px 64px -12px rgba(var(--text-rgb), .28)` | dialogs, drawers, over `--scrim` |

## 7. Animation & Interaction

**Motion Philosophy**: motion confirms, it never performs. Only opacity and transform; everything is under 300ms.
**Tier**: L1 in the app; L2 on the public report.

### Dependencies
None. CSS keyframes (`fade-up`, `dialog-in`, `drawer-in`, `mask-reveal`, `hero-settle`) plus a rAF count-up; keeping the initial bundle under the 200 KB gzip budget.

### Base Setup
```css
--ease: cubic-bezier(.2, .7, .2, 1);
--ease-out: cubic-bezier(.16, 1, .3, 1);
--dur-fast: 120ms; --dur-base: 180ms; --dur-slow: 260ms;
```

### Entrance Animation
```css
@keyframes fade-up { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
@keyframes shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
@keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.35; } }
.enter { animation:fade-up var(--dur-slow) var(--ease-out) both; }
.enter-stagger > * { animation:fade-up var(--dur-slow) var(--ease-out) both; }
.enter-stagger > *:nth-child(2){animation-delay:30ms} .enter-stagger > *:nth-child(3){animation-delay:60ms}
.enter-stagger > *:nth-child(4){animation-delay:90ms} .enter-stagger > *:nth-child(n+5){animation-delay:120ms}
```

### Scroll Behavior
- App: no scroll reveals (dashboard data must be visible immediately). The top bar gains a hairline border once the page is scrolled.
- Public report (L2): sections fade up once when 15% visible (IntersectionObserver, `once`), and the hero image has a subtle 1.04→1 scale on load.

### Hover & Focus States
- Every interactive element has a hover state (background or border shift) and a `:focus-visible` outline of 2px `--focus-ring`.
- Table rows use `--surface-hover` on hover. Media images zoom 1.03 inside their frame.

### Special Effects
- **KPI count-up**: numbers animate from 0 on first render (600ms, ease-out); skipped with reduced motion.
- **Processing pulse**: a dot on PROCESSING assets pulses (`pulse-dot` 1.6s).
- **Before/after slider**: the handle follows the pointer through rAF, and the arrow keys move it 2% at a time (10% with Shift).
- **Command palette (⌘K / Ctrl K)**: the hidden touch. It jumps to any project, page or evidence search.

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:1ms !important; animation-iteration-count:1 !important;
    transition-duration:1ms !important; scroll-behavior:auto !important; }
}
```

## 8. Do's and Don'ts

### Do
- Let real field photos carry the colour. Keep the chrome neutral.
- Show provenance next to every AI statement: source count, model, timestamp, and a "Trace" link.
- Label trust kinds (Observed / Inferred / Claimed) and location sources in words.
- Give every list its loading skeleton, empty state (with a next action) and error state (with retry).
- Hide write actions from viewers instead of letting them fail; explain in a tooltip where it helps.
- Keep one primary CTA per view, and put destructive actions behind a confirmation.
- Truncate long IDs in mono with a copy button.

### Don't
- ❌ Hardcoded hex/rgb values in components; everything goes through tokens.
- ❌ Neon, glow, glassmorphism, purple-blue "AI" gradients, sparkles next to AI output.
- ❌ Calling AI output "verified", "proven" or "measured impact", or using a green check for AI confidence.
- ❌ Solid grey placeholder blocks for media; use the fallback illustration with the file name.
- ❌ Scroll-reveal, parallax or lifting cards inside the app shell.
- ❌ Text below 11px, or body copy below 13px.
- ❌ Colour as the only carrier of meaning.
- ❌ Emoji as icons (use lucide-react).
- ❌ More than one accent colour per section, or decorative gradients on headings.
- ❌ Modal-on-modal; use a drawer for detail and a dialog for confirmation.

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | ≥ 1024px | Fixed 248px sidebar, split layouts side by side, media grid 4–5 columns |
| Tablet | 640–1023px | Sidebar becomes an off-canvas drawer behind a menu button; split layouts stack; grid 2–3 columns |
| Mobile | < 640px | Single column, KPI grid 2 columns, filters collapse into a "Filters" sheet, drawers go full-screen, tables become stacked cards |

**Touch Targets:** at least 44×44px on coarse pointers (`@media (pointer: coarse)` raises `.btn`, `.chip` and `.nav-item` to 44px high).
**Collapsing Strategy:** navigation moves to a drawer; secondary actions go into an overflow menu; tables become cards; the before/after slider stays full width with a larger handle.

```css
@media (max-width: 1023px) { .split { grid-template-columns:1fr; } }
@media (max-width: 639px) { .kpi-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
@media (pointer: coarse) { .btn, .chip, .nav-item { min-height:44px; } }
```
