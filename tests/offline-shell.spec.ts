import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('petlist:walkthrough:v1', 'seen')); });

test('production shell reopens offline and retains a new task through reload', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:8788/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  const manifest = await (await page.request.get('http://127.0.0.1:8788/manifest.webmanifest')).json();
  expect(manifest.name).toBe('PetList'); expect(manifest.display).toBe('standalone');
  const icon = await page.request.get('http://127.0.0.1:8788/apple-touch-icon.png');
  expect(icon.headers()['content-type']).toContain('image/png');
  expect((await icon.body()).readUInt32BE(16)).toBe(180);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'PetList home' })).toBeVisible();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.getByLabel('Task name').fill('A task saved offline');
  await page.getByRole('button', { name: /^Add to/ }).click();
  await page.reload();
  await expect(page.locator('.task-row').filter({ hasText: 'A task saved offline' })).toBeVisible();
  await expect(page.getByTestId('meadow-dog')).toBeVisible();
});
