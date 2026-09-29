import { test as setup } from '@playwright/test';
import { signIn } from './helpers';

// Sign in once per role and reuse the session cookie (keeps runs well under the login rate limit).
for (const who of ['manager', 'viewer'] as const) {
  setup(`authenticate as ${who}`, async ({ page }) => {
    await signIn(page, who);
    await page.context().storageState({ path: `e2e/.auth/${who}.json` });
  });
}
