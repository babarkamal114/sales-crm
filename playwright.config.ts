import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? '3000');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results/playwright',
  use: {
    baseURL,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `pnpm exec next start -p ${port}`,
        url: `${baseURL}/sign-in`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          ...process.env,
          PLAYWRIGHT_E2E: '1',
          ALLOW_INSECURE_SESSION_COOKIES: 'true',
          TURNSTILE_SECRET_KEY: '',
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
          TURNSTILE_HOSTNAMES: '',
        },
      },
});
