import type { Page } from '@playwright/test';
import { loadE2EAuthFixture } from './fixtures';

export async function signInAsAdmin(page: Page) {
  const fixture = loadE2EAuthFixture();

  await page.goto('/sign-in');
  await page.getByLabel('Work email').fill(fixture.email);
  await page.getByLabel('Password', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 60_000 });
}
