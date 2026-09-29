const PDFDocument = require('pdfkit');

const INK = '#1f2d25';
const MUTED = '#5f6d64';
const BRAND = '#267953';
const RULE = '#dfe5df';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** Renders a stored report's structured content as a readable, sectioned PDF. */
function renderReportPdf(report) {
  const c = report.content || {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () =>
      resolve({ contentType: 'application/pdf', content: Buffer.concat(chunks) }),
    );
    doc.on('error', reject);
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const heading = (text) => {
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.moveDown(1.2);
      doc
        .fillColor(BRAND)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(text.toUpperCase(), { characterSpacing: 1 });
      const y = doc.y + 3;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.margins.left + width, y)
        .strokeColor(RULE)
        .lineWidth(0.7)
        .stroke();
      doc.moveDown(0.6);
      doc.fillColor(INK).font('Helvetica').fontSize(10.5);
    };
    const para = (text, opts = {}) =>
      doc
        .fillColor(opts.color || INK)
        .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts.size || 10.5)
        .text(text, { lineGap: 3, ...opts });
    const bullets = (items) => items.forEach((t) => para(`•  ${t}`, { indent: 4 }));

    // Cover block
    doc
      .fillColor(BRAND)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('IMPACTLENS · EVIDENCE REPORT', { characterSpacing: 1.2 });
    doc.moveDown(0.6);
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(report.title || 'Impact Evidence Report');
    const o = c.overview || {};
    doc.moveDown(0.3);
    para([o.name, o.organization, o.location].filter(Boolean).join('  ·  '), { color: MUTED });
    para(`Generated ${fmtDate(report.createdAt)}`, { color: MUTED, size: 9 });
    if (o.description) {
      doc.moveDown(0.6);
      para(o.description);
    }

    // KPI strip
    const k = c.kpis;
    if (k) {
      doc.moveDown(1);
      const cells = [
        ['Media assets', k.totalMedia],
        ['AI analyzed', k.aiAnalyzed],
        ['Locations', k.locations],
        ['Evidence coverage', `${k.coveragePercent ?? 0}%`],
      ];
      const cw = width / cells.length;
      const top = doc.y;
      cells.forEach(([label, value], i) => {
        const x = doc.page.margins.left + i * cw;
        doc
          .roundedRect(x + 2, top, cw - 4, 50, 4)
          .fillColor('#f3f6f2')
          .fill();
        doc
          .fillColor(INK)
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(String(value ?? '—'), x + 10, top + 9, { width: cw - 20 });
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(8.5)
          .text(label, x + 10, top + 31, { width: cw - 20 });
      });
      doc.x = doc.page.margins.left;
      doc.y = top + 60;
    }

    if (c.objectives?.length) {
      heading('Objectives');
      bullets(c.objectives);
    }
    if (c.activities?.length) {
      heading('Documented activities (AI-detected)');
      para(c.activities.join('  ·  '));
    }
    if (c.timeline?.length) {
      heading('Timeline');
      c.timeline.forEach((t) =>
        para(
          `${t.label || t.month}  —  ${t.assetCount} assets${t.activities?.length ? `: ${t.activities.join(', ')}` : ''}`,
        ),
      );
    }
    if (c.locationMap?.length) {
      heading('Locations');
      c.locationMap.forEach((l) =>
        para(
          `${l.name}  —  ${l.count} assets  (${String(l.source || 'UNKNOWN')
            .replace('_', ' ')
            .toLowerCase()})`,
        ),
      );
    }
    if (c.aiObservations?.length) {
      heading('AI observations');
      para('Each statement is an AI interpretation of uploaded media, not a verified outcome.', {
        color: MUTED,
        size: 9,
      });
      doc.moveDown(0.3);
      c.aiObservations
        .slice(0, 30)
        .forEach((x) =>
          para(
            `[${x.kind}${x.confidence != null ? ` · ${Math.round(x.confidence * 100)}%` : ''}]  ${x.statement}`,
          ),
        );
    }
    if (c.evidenceGaps?.length) {
      heading('Evidence gaps');
      c.evidenceGaps.forEach((g) => para(`${g.message} — ${g.suggestedAction}`));
    }
    if (c.traceability?.length) {
      heading('Evidence traceability');
      const cols = [0.44, 0.26, 0.3].map((f) => f * width);
      const row = (vals, bold) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const y = doc.y;
        let x = doc.page.margins.left;
        vals.forEach((v, i) => {
          doc
            .fillColor(bold ? MUTED : INK)
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8)
            .text(String(v ?? '—'), x, y, { width: cols[i] - 6, lineBreak: false, ellipsis: true });
          x += cols[i];
        });
        doc.x = doc.page.margins.left;
        doc.y = y + 13;
      };
      row(['Cloudinary asset', 'AI model', 'Analyzed at'], true);
      c.traceability
        .slice(0, 120)
        .forEach((t) => row([t.publicId, t.model, fmtDate(t.analyzedAt)]));
      if (c.traceability.length > 120)
        para(`… ${c.traceability.length - 120} more assets in the online report.`, {
          color: MUTED,
          size: 8,
        });
    }
    heading('Methodology & disclaimer');
    para(c.methodology || '');
    para(c.disclaimer || '', { color: MUTED });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // The footer sits inside the bottom margin; lift the margin so PDFKit doesn't add a page.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8)
        .text(
          `ImpactLens · ${report.title || 'Impact Evidence Report'} · Page ${i + 1} of ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 36,
          { width, align: 'center', lineBreak: false },
        );
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}

module.exports = { renderReportPdf };
