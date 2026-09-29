import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderUi } from '@/test/render';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ConfidenceBadge, LocationSourceBadge, TrustKindBadge } from './Badges';
import { MediaThumb } from './MediaThumb';

describe('BeforeAfterSlider', () => {
  it('is keyboard operable and exposes its value', () => {
    renderUi(<BeforeAfterSlider beforeSrc="/b.jpg" afterSrc="/a.jpg" />);
    const slider = screen.getByRole('slider', { name: /reveal before and after/i });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '52');
    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(slider).toHaveAttribute('aria-valuenow', '42');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('trust language', () => {
  it('labels confidence as AI confidence, never as verification', () => {
    renderUi(<ConfidenceBadge value={0.78} />);
    expect(screen.getByText(/AI confidence/)).toHaveTextContent('AI confidence 78%');
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
  });
  it('shows a named activity with its percentage', () => {
    renderUi(<ConfidenceBadge value={0.94} label="Plantation" />);
    expect(screen.getByText(/Plantation/)).toHaveTextContent('Plantation 94%');
  });
  it('renders AI-estimated locations as a dashed, approximate badge', () => {
    renderUi(<LocationSourceBadge source="AI_ESTIMATED" place="Noida" />);
    const badge = screen.getByText('Noida · AI estimated').closest('span[class*="rounded-full"]');
    expect(badge?.className).toMatch(/border-dashed/);
  });
  it('names each trust kind in words', () => {
    renderUi(
      <>
        <TrustKindBadge kind="OBSERVED" />
        <TrustKindBadge kind="INFERRED" />
        <TrustKindBadge kind="CLAIMED" />
      </>,
    );
    ['Observed', 'Inferred', 'Claimed'].forEach((k) => expect(screen.getByText(k)).toBeInTheDocument());
  });
});

describe('MediaThumb', () => {
  it('falls back to an informative placeholder when the image fails', () => {
    renderUi(<MediaThumb src="/broken.jpg" alt="Riverbank" filename="riverbank-01.jpg" />);
    fireEvent.error(screen.getByRole('img', { name: 'Riverbank' }));
    expect(screen.getByRole('img', { name: 'Riverbank' })).toHaveTextContent('riverbank-01.jpg');
  });
});
