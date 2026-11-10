import { expect, test } from '@playwright/test';
import { signInAsAdmin } from './auth-helpers';
import { expectNoSeriousAxeViolations } from './axe-check';
import { e2eConfigured } from './fixtures';

test.describe('Contacts workflows (F15)', () => {
  test.skip(!e2eConfigured, 'Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

  test('W1 — add contact and open quick view', async ({ page }) => {
    const token = Date.now();
    const email = `e2e.contact.${token}@example.com`;

    await signInAsAdmin(page);
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'contacts list');

    await page.getByRole('button', { name: 'Add contact' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add contact' });
    await dialog.getByRole('textbox').nth(0).fill('E2E');
    await dialog.getByRole('textbox').nth(1).fill(`Contact ${token}`);
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.getByRole('button', { name: 'Save contact' }).click();

    await expect(page).toHaveURL(/contact=/, { timeout: 30_000 });
    await expectNoSeriousAxeViolations(page, 'contact quick view');
  });

  test('W1 — duplicate email shows conflict UI (C3)', async ({ page }) => {
    const token = Date.now();
    const email = `e2e.dup.${token}@example.com`;

    await signInAsAdmin(page);
    await page.goto('/contacts');
    await page.getByRole('button', { name: 'Add contact' }).click();
    let dialog = page.getByRole('dialog', { name: 'Add contact' });
    await dialog.getByRole('textbox').nth(0).fill('First');
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.getByRole('button', { name: 'Save contact' }).click();
    await expect(page).toHaveURL(/contact=/, { timeout: 30_000 });

    await page.goto('/contacts');
    await page.getByRole('button', { name: 'Add contact' }).click();
    dialog = page.getByRole('dialog', { name: 'Add contact' });
    await dialog.getByRole('textbox').nth(0).fill('Second');
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.getByRole('button', { name: 'Save contact' }).click();
    await expect(dialog.getByText('Duplicate found')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Open it' })).toBeVisible();
  });

  test('W2 — import CSV from contacts import page', async ({ page }) => {
    const token = Date.now();
    const csv = [
      'contact_name,opportunity_title,email',
      `Import One ${token},Starter deal ${token},import.one.${token}@example.com`,
      `Import Two ${token},Follow-up ${token},import.two.${token}@example.com`,
    ].join('\n');

    await signInAsAdmin(page);
    await page.goto('/contacts/import');
    await expect(page.getByRole('heading', { name: 'Import contacts' })).toBeVisible();
    await page.getByRole('button', { name: 'Paste CSV instead' }).click();
    await page.getByPlaceholder('Paste CSV including the header row…').fill(csv);
    await page.getByRole('button', { name: 'Validate pasted CSV' }).click();
    await expect(page.getByText('2 ready to import')).toBeVisible();
    await page.getByRole('button', { name: /Import 2 leads/ }).click();
    await expect(page).toHaveURL('/contacts', { timeout: 60_000 });
    await expectNoSeriousAxeViolations(page, 'contacts after import');
  });

  test('W4 — merge duplicates from lead profile', async ({ page }) => {
    const token = Date.now();
    const email = `e2e.merge.${token}@example.com`;
    const phone = '07700900456';

    await signInAsAdmin(page);

    async function createContact(first: string, mail: string, tel: string, force = false) {
      await page.goto('/contacts');
      await page.getByRole('button', { name: 'Add contact' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add contact' });
      await dialog.getByRole('textbox').nth(0).fill(first);
      await dialog.locator('input[type="email"]').fill(mail);
      await dialog.getByRole('textbox').nth(3).fill(tel);
      await dialog.getByRole('button', { name: 'Save contact' }).click();
      if (force) {
        await expect(dialog.getByText('Duplicate found')).toBeVisible();
        await dialog.getByRole('button', { name: 'Create anyway' }).click();
      }
      await expect(page).toHaveURL(/\/contacts\?contact=/, { timeout: 30_000 });
      const url = new URL(page.url());
      const id = url.searchParams.get('contact');
      expect(id).toBeTruthy();
      return id!;
    }

    const primaryId = await createContact('Merge', email, phone);
    await createContact('Dup', email, phone, true);

    await page.goto(`/contacts/${primaryId}/activity`);
    await expect(page.getByText(/possible duplicate/i)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Review merge' }).click();
    const mergeDialog = page.getByRole('dialog', { name: 'Merge duplicates' });
    await mergeDialog.getByRole('button', { name: /Merge into/i }).click();
    await expect(page.getByText(/possible duplicate/i)).toHaveCount(0, { timeout: 30_000 });
  });

  test('W7 — opportunities tab shows deals surface', async ({ page }) => {
    const token = Date.now();
    const email = `e2e.deal.${token}@example.com`;

    await signInAsAdmin(page);
    await page.goto('/contacts');
    await page.getByRole('button', { name: 'Add contact' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add contact' });
    await dialog.getByRole('textbox').nth(0).fill('Deal');
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.getByRole('button', { name: 'Save contact' }).click();
    await expect(page).toHaveURL(/contact=/, { timeout: 30_000 });
    const contactId = new URL(page.url()).searchParams.get('contact');
    expect(contactId).toBeTruthy();

    await page.goto(`/contacts/${contactId}/opportunities`);
    await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add deal' })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'contact opportunities tab');
  });

  test('W10 — SAR export and GDPR erase', async ({ page }) => {
    const token = Date.now();
    const email = `e2e.erase.${token}@example.com`;

    await signInAsAdmin(page);
    await page.goto('/contacts');
    await page.getByRole('button', { name: 'Add contact' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add contact' });
    await dialog.getByRole('textbox').nth(0).fill('Erase');
    await dialog.getByRole('textbox').nth(1).fill(`Me ${token}`);
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.getByRole('button', { name: 'Save contact' }).click();
    await expect(page).toHaveURL(/contact=/, { timeout: 30_000 });
    const contactId = new URL(page.url()).searchParams.get('contact');
    expect(contactId).toBeTruthy();

    await page.goto(`/contacts/${contactId}/activity`);
    await page.getByRole('tab', { name: 'Actions' }).click();
    await page.getByRole('button', { name: 'Export (SAR)' }).click();
    await expect(page.getByText('Export requested')).toBeVisible();

    await page.getByRole('button', { name: 'Erase (GDPR)' }).click();
    const eraseDialog = page.getByRole('dialog', { name: /Erase contact/i });
    const displayName = await eraseDialog
      .locator('.rounded-lg.bg-soft')
      .innerText();
    await eraseDialog.getByPlaceholder('Type name to confirm').fill(displayName);
    await eraseDialog.getByRole('button', { name: /Erase permanently/i }).click();
    await expect(page).toHaveURL('/contacts', { timeout: 60_000 });
  });
});
