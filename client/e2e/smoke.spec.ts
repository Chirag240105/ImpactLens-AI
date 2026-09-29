import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openDemoProject, settleAnimations } from './helpers';

test('core pages render without overflow or WCAG A/AA violations', async ({ page }) => {
  await openDemoProject(page);
  const base = page.url();
  for (const path of ['', '/evidence', '/timeline', '/compare', '/insights', '/reports']) {
    await page.goto(base + path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await settleAnimations(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path || '/'}`).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('.leaflet-container').analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`), `axe on ${path || '/'}`).toEqual([]);
  }
});
