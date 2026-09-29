import { expect, test, type Page } from '@playwright/test';
import { openDemoProject } from './helpers';

// browser.newContext() inherits the project's stored session; the login page needs a signed-out one.
const LOGGED_OUT = { storageState: { cookies: [], origins: [] } };

/** Answers Nominatim reverse-geocoding locally so tests never depend on the network. */
async function fakeGeocoder(page: Page) {
  await page.route('https://nominatim.openstreetmap.org/**', (route) => {
    const lat = Number(new URL(route.request().url()).searchParams.get('lat'));
    const address = lat > 25 ? { city: 'Noida', state: 'Uttar Pradesh' } : { city: 'Mumbai', state: 'Maharashtra' };
    return route.fulfill({ json: { address } });
  });
}

test.describe('live location', () => {
  test.use({ geolocation: { latitude: 28.5355, longitude: 77.391, accuracy: 25 }, permissions: ['geolocation'] });

  test('login card shows the real time and the device location, and can update it', async ({ browser }) => {
    const ctx = await browser.newContext({ ...LOGGED_OUT, geolocation: { latitude: 28.5355, longitude: 77.391, accuracy: 25 }, permissions: ['geolocation'] });
    const page = await ctx.newPage();
    await fakeGeocoder(page);
    await page.goto('/login');
    const card = page.getByRole('complementary', { name: 'Capture context' });
    await expect(card.getByText('Noida, Uttar Pradesh')).toBeVisible();
    await expect(card.getByText('Device location · ±25 m')).toBeVisible();
    const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    await expect(card.locator('time')).toContainText(today);

    await ctx.setGeolocation({ latitude: 19.076, longitude: 72.8777, accuracy: 40 });
    await card.getByRole('button', { name: 'Update my location' }).click();
    await expect(card.getByText('Mumbai, Maharashtra')).toBeVisible();
    await ctx.close();
  });

  test('upload dialog fills coordinates and place name from the device', async ({ page }) => {
    await fakeGeocoder(page);
    await openDemoProject(page);
    await page.goto(page.url() + '/evidence?upload=1');
    const dialog = page.getByRole('dialog', { name: 'Upload field media' });
    await dialog.getByRole('button', { name: 'Use my current location' }).click();
    await expect(dialog.getByLabel('Latitude')).toHaveValue('28.535500');
    await expect(dialog.getByLabel('Longitude')).toHaveValue('77.391000');
    await expect(dialog.getByLabel('Place name')).toHaveValue('Noida, Uttar Pradesh');
    await expect(dialog.getByRole('button', { name: 'Update my location' })).toBeVisible();
  });
});

test('without permission the login card asks before using location', async ({ browser }) => {
  const ctx = await browser.newContext(LOGGED_OUT);
  const page = await ctx.newPage();
  await page.goto('/login');
  const card = page.getByRole('complementary', { name: 'Capture context' });
  await expect(card.getByText('Location not shared yet')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Share my location' })).toBeVisible();
  await ctx.close();
});
