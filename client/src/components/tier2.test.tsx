import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderUi } from '@/test/render';
import { IntegrityBadge, IntegrityFlags } from './evidence/Integrity';
import { SdgChip, SdgList } from './Sdg';
import { needsReview, scoreTone } from '@/lib/integrity';

describe('integrity UI', () => {
  const flagged = {
    score: 52,
    flags: [
      { code: 'DUPLICATE_EXACT', severity: 'high' as const, message: 'Identical file is also used in project “Other”.' },
      { code: 'NO_LOCATION', severity: 'low' as const, message: 'No location attached.' },
    ],
  };
  it('marks medium/high flags for review and labels each flag in words', () => {
    expect(needsReview(flagged)).toBe(true);
    expect(needsReview({ score: 92, flags: [flagged.flags[1]!] })).toBe(false);
    expect(scoreTone(90)).toBe('success');
    expect(scoreTone(52)).toBe('error');
    renderUi(
      <>
        <IntegrityBadge integrity={flagged} />
        <IntegrityFlags integrity={flagged} />
      </>,
    );
    expect(screen.getByText(/Review/)).toHaveTextContent('Review 52');
    expect(screen.getByText('Exact duplicate')).toBeInTheDocument();
    expect(screen.getByText(/also used in project/)).toBeInTheDocument();
  });
  it('reports a clean asset plainly', () => {
    renderUi(<IntegrityFlags integrity={{ score: 100, flags: [] }} />);
    expect(screen.getByText(/No duplicate, metadata, date or location issues/)).toBeInTheDocument();
  });
});

describe('SDG UI', () => {
  it('names goals in text, not only colour', () => {
    renderUi(
      <>
        <SdgChip goal={15} name="Life on Land" />
        <SdgList items={[{ goal: 6, name: 'Clean Water and Sanitation', assets: 8, share: 40, topTerms: ['water', 'river'] }]} />
      </>,
    );
    expect(screen.getByText('SDG 15')).toBeInTheDocument();
    expect(screen.getByText(/Clean Water and Sanitation/)).toBeInTheDocument();
    expect(screen.getByText('matched: water, river')).toBeInTheDocument();
    expect(screen.getByText(/8 assets · 40%/)).toBeInTheDocument();
  });
});
