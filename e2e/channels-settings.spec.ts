import { expect, test } from '@playwright/test';
import { signInAsAdmin } from './auth-helpers';
import { e2eConfigured } from './fixtures';

test.describe('Channels settings (Phase 8)', () => {
  test.skip(!e2eConfigured, 'Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

  test('loads Channels overview with core cards', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/settings/channels');
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phone & SMS' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WhatsApp' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Usage & limits' })).toBeVisible();
  });

  test('Usage page shows monthly spend section', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/settings/channels/usage');
    await expect(page.getByRole('heading', { name: 'Usage & limits' })).toBeVisible();
    await expect(page.getByText('This month')).toBeVisible();
  });

  test('WhatsApp page loads manage UI', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/settings/channels/whatsapp');
    await expect(page.getByRole('heading', { name: 'WhatsApp' })).toBeVisible();
    await expect(page.getByText(/Managed WhatsApp|Bring your own Meta/i)).toBeVisible();
  });
});
