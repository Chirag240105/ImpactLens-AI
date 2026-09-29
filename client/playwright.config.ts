import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs the judge-facing walkthrough (docs/demo-script.md) against a real API in offline mock
 * mode. Needs a local MongoDB; override E2E_MONGODB_URI to point elsewhere. Existing servers on
 * :5000 / :3000 are reused outside CI.
 */
const mongo = process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:27017/impactlens_e2e';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/manager.json' },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/manager.json' },
      dependencies: ['setup'],
      testMatch: /smoke\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'node utils/seedDemoData.js && node server.js',
      cwd: '../server',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        MONGODB_URI: mongo,
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-change-me',
        CLOUDINARY_MODE: 'mock',
        AI_PROVIDER: 'mock',
        NODE_ENV: 'development',
        PORT: '5000',
        CLIENT_URL: 'http://localhost:3000',
        PUBLIC_REPORT_BASE_URL: 'http://localhost:3000/reports',
        RATE_LIMIT_MAX: '2000',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
