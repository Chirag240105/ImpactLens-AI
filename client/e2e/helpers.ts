import { expect, type Page } from '@playwright/test';

export const DEMO = {
  manager: { button: /Manager/, email: 'manager@impactlens.demo' },
  viewer: { button: /Viewer/, email: 'viewer@impactlens.demo' },
} as const;

/** Signs in through the UI using a seeded demo account's quick-fill button. */
export async function signIn(page: Page, who: keyof typeof DEMO = 'manager') {
  await page.goto('/login');
  await page.getByRole('button', { name: DEMO[who].button }).click();
  await expect(page.getByLabel('Email')).toHaveValue(DEMO[who].email);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** A valid 1×1 PNG (passes the server's magic-byte check). */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
  'base64',
);

/** Opens the seeded demo project from the projects list (session comes from storageState). */
export async function openDemoProject(page: Page) {
  await page.goto('/projects');
  await page.getByRole('link', { name: 'Yamuna Urban Restoration Initiative' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Yamuna Urban Restoration Initiative' })).toBeVisible();
}

/** A link in the sidebar's Project navigation (avoids matching in-page links with similar names). */
export const projectNav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name, exact: true });

/** Waits for entrance animations so audits don't sample half-faded elements. */
export async function settleAnimations(page: Page) {
  // Infinite loops (skeleton shimmer, pulsing status dots) never finish; only await one-shot animations.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}
