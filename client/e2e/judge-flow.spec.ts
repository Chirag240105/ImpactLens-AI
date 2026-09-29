import { expect, test } from '@playwright/test';
import { openDemoProject, PNG, projectNav } from './helpers';

/**
 * docs/demo-script.md success criteria:
 * Login → Create project → Upload media → AI analysis → View AI metadata → Search naturally →
 * Open evidence → Compare before/after → View timeline → See evidence trace →
 * Generate impact story → Generate report → Open public report
 */
test.describe('judge-facing walkthrough', () => {
  test('create a project, upload evidence and see AI analysis complete', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New project' }).click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    const name = `E2E Canopy ${Date.now()}`;
    await dialog.getByLabel('Project name').fill(name);
    await dialog.getByLabel('Organization').fill('E2E Green Futures');
    await dialog.getByLabel('Primary location').fill('Pune');
    await dialog.getByRole('button', { name: 'Create project' }).click();

    // Creating a project lands on its Evidence Explorer with the upload dialog open.
    const upload = page.getByRole('dialog', { name: 'Upload field media' });
    await expect(upload).toBeVisible();
    await upload.locator('input[type="file"]').setInputFiles([
      { name: 'tree-planting-day1.png', mimeType: 'image/png', buffer: PNG },
      { name: 'waste-cleaning-drive.png', mimeType: 'image/png', buffer: PNG },
    ]);
    await expect(upload.getByText('2 files ·')).toBeVisible();
    await upload.getByLabel('Evidence type').selectOption('BEFORE');
    await upload.getByRole('button', { name: /^Upload 2/ }).click();
    await expect(upload).toBeHidden();

    await expect(page.getByText('2 results')).toBeVisible();
    // Mock AI derives the activity from the filename; polling flips cards to analyzed.
    await expect(page.getByText('Plantation 78%')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Cleaning 78%')).toBeVisible();

    await projectNav(page, 'Overview').click();
    await expect(page.getByRole('region', { name: 'Project indicators' })).toContainText('2');
  });

  test('search naturally, open evidence and inspect AI metadata', async ({ page }) => {
    await openDemoProject(page);
    await projectNav(page, 'Evidence Explorer').click();
    await page.getByRole('searchbox', { name: 'Search evidence' }).fill('Show evidence of community participation');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/q=Show/);
    await expect(page.getByText(/results? for “Show evidence of community participation”/)).toBeVisible();
    await expect(page.getByText('Matching')).toBeVisible();

    await page.getByRole('article').first().getByRole('button').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('What the AI saw vs. what it inferred')).toBeVisible();
    await expect(drawer.getByText('Observed', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Inferred', { exact: true })).toBeVisible();
    await expect(drawer.getByText(/AI confidence \d+%/)).toBeVisible();
    await expect(drawer.getByText('Cloudinary asset')).toBeVisible();
    await expect(drawer.getByText('impactlens-mock-v1')).toBeVisible();
    // Deep link survives reload.
    await page.reload();
    await expect(page.getByRole('dialog').getByText('Provenance')).toBeVisible();
  });

  test('compare before/after, view timeline and trace an insight', async ({ page }) => {
    await openDemoProject(page);

    await projectNav(page, 'Before / After').click();
    await page.getByRole('button', { name: /Same location/ }).first().click();
    await expect(page.getByRole('slider', { name: 'Reveal before and after' })).toBeVisible();
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI-detected visual difference' })).toBeVisible();
    await expect(page.getByText('Visual change score')).toBeVisible();

    await projectNav(page, 'Timeline').click();
    await expect(page.getByRole('heading', { name: 'Jan 2026' })).toBeVisible();

    await projectNav(page, 'AI Insights').click();
    await page.getByRole('button', { name: 'Generate insights' }).first().click();
    await page.getByRole('button', { name: 'Trace evidence' }).first().click();
    const trace = page.getByRole('dialog', { name: 'Evidence trace' });
    await expect(trace.getByText(/source(s)? behind this claim/)).toBeVisible();
    await expect(trace.getByText('Original Cloudinary asset').first()).toBeVisible();
    await expect(trace.getByText('AI analysis').first()).toBeVisible();
  });

  test('generate a story and report, publish it and open the public page logged out', async ({ page, browser }) => {
    await openDemoProject(page);
    await projectNav(page, 'Reports').click();

    await page.getByRole('button', { name: 'Generate impact story' }).click();
    await expect(page.getByText('Impact story', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page).toHaveURL(/\/reports\/[a-f0-9]{24}$/);
    await expect(page.getByRole('heading', { name: 'Evidence traceability' })).toBeVisible();

    const pdf = await page.request.get(await page.getByRole('link', { name: 'Download PDF' }).getAttribute('href') as string);
    expect(pdf.headers()['content-type']).toContain('application/pdf');

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('button', { name: 'Publish report' }).click();
    const href = await page.getByRole('link', { name: 'Open public page' }).getAttribute('href');
    expect(href).toMatch(/^\/reports\/[a-f0-9]{40}$/);

    const anon = await browser.newContext();
    const pub = await anon.newPage();
    await pub.goto(href!);
    await expect(pub.getByRole('heading', { level: 1, name: 'Yamuna Urban Restoration Initiative' })).toBeVisible();
    await expect(pub.getByRole('heading', { name: 'Methodology & limitations' })).toBeVisible();
    await expect(pub.getByText('— – ongoing')).toHaveCount(0);
    await anon.close();
  });
});

test.describe('viewer role', () => {
  test.use({ storageState: 'e2e/.auth/viewer.json' });
  test('gets a read-only workspace', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo');
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
    await page.goto('/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
  });
});
