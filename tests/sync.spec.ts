import { test, expect, type BrowserContext, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('petlist:walkthrough:v1', 'seen')); });
import { applyCommand, type Command } from '../src/domain/commands';
import { emptyState, settleRewards } from '../src/domain/state';

async function petPositions(page: Page): Promise<Record<string, [number, number]>> {
  return page.locator('.meadow-dog').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [
    node.getAttribute('data-pet'),
    [Number(node.getAttribute('data-x')), Number(node.getAttribute('data-y'))],
  ])));
}

test('two devices converge, keep offline edits through reload, and avoid duplicate feeding', async ({ browser }) => {
  let state = emptyState(); let revision = 0;
  const receipts = new Map<string, { id: string; error: string | null }>();
  const user = { id: 'test-google-user', email: 'petlist@example.com', name: 'Test' };
  async function connect(context: BrowserContext) {
    await context.addInitScript(() => localStorage.setItem('petlist:walkthrough:v1', 'seen'));
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/session') return route.fulfill({ json: { user, clientId: 'test-client', nonce: null } });
      if (path === '/api/sync') {
        const results = [];
        for (const command of route.request().postDataJSON().commands as Command[]) {
          let receipt = receipts.get(command.id);
          if (!receipt) {
            let error = null;
            try { state = applyCommand(settleRewards(state, Date.now()), command, Date.now(), revision); } catch (reason) { error = (reason as Error).message; }
            receipt = { id: command.id, error }; receipts.set(command.id, receipt); revision++;
          }
          results.push(receipt);
        }
        state = settleRewards(state, Date.now());
        return route.fulfill({ json: { state, revision, receipts: results } });
      }
      return route.fulfill({ json: { state, revision } });
    });
  }
  const laptop = await browser.newContext(); const phone = await browser.newContext();
  await connect(laptop); await connect(phone);
  const a = await laptop.newPage(); const b = await phone.newPage();
  await a.goto('/'); await b.goto('/');
  await expect(a.locator('.sync-banner')).toContainText('Cloud planner');
  await a.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByLabel('Default task category').selectOption('Health');
  await b.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(b.getByLabel('Default task category')).toHaveValue('Health', { timeout: 12_000 });
  await a.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await b.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await a.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(a.getByLabel('Category', { exact: true })).toHaveValue('Health');
  await a.getByLabel('Task name').fill('Laptop task');
  await a.getByRole('button', { name: /^Add to/ }).click();
  await expect(b.locator('.task-row')).toContainText('Laptop task', { timeout: 12_000 });
  await phone.setOffline(true);
  await b.getByRole('button', { name: 'Add task', exact: true }).click();
  await b.getByLabel('Task name').fill('Phone offline task');
  await b.getByRole('button', { name: /^Add to/ }).click();
  await expect(b.locator('.task-row').filter({ hasText: 'Phone offline task' })).toBeVisible();
  // Remove a category on the laptop while the phone still has commands using its old ID.
  await a.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Remove Health' }).click();
  await a.getByLabel('Replacement category').selectOption('Work');
  await a.getByRole('button', { name: 'Move tasks and remove' }).click();
  await expect(a.getByLabel('Default task category')).toHaveValue('Work');
  await a.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  // The durable queue survives a fresh page even before reconnect; the shell itself is cached in production.
  const queued = await b.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('petlist:outbox:')));
  expect(queued).toHaveLength(1);
  await phone.setOffline(false); await b.reload();
  await expect(a.locator('.task-row').filter({ hasText: 'Phone offline task' })).toBeVisible({ timeout: 12_000 });
  expect(state.tasks).toHaveLength(2);
  expect(state.tasks.map(task => task.category)).toEqual(['Work', 'Work']);
  await expect(b.locator('.task-row .category')).toHaveText(['Work', 'Work']);
  await a.getByRole('button', { name: 'Feed · +3 coins', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Fed today', exact: true })).toBeDisabled({ timeout: 12_000 });
  expect(state.coins).toBe(3);
  await phone.setOffline(true);
  await a.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await a.getByRole('button', { name: 'Add category', exact: true }).click();
  await a.getByLabel('Category name').fill('Learning');
  await a.getByRole('button', { name: 'Save category' }).click();
  await b.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await b.getByRole('button', { name: 'Add category', exact: true }).click();
  await b.getByLabel('Category name').fill('Learning');
  await b.getByRole('button', { name: 'Save category' }).click();
  await phone.setOffline(false);
  await expect(b.locator('.sync-conflicts')).toContainText('already exists', { timeout: 12000 });
  await b.getByText('Review category change', { exact: true }).click();
  await expect(b.locator('.category-change-review')).toContainText('Learning');
  expect(state.categories.filter(category => category.name === 'Learning')).toHaveLength(1);
  await b.reload();
  await b.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(b.locator('.sync-conflicts')).toContainText('already exists');

  await laptop.close(); await phone.close();
});

test('pet purchases, free feeding, collection swaps and phone input size persist', async ({ page }, info) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pets-seeded')) return;
    localStorage.setItem('little-by-little:v1', JSON.stringify({ version: 1, tasks: [], coins: 180, owned: [], placements: {}, bonusDays: [] }));
    sessionStorage.setItem('pets-seeded', 'true');
  });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Shop', exact: true }).click();
  for (const name of ['cat', 'bunny', 'hamster']) {
    const card = page.locator('.shop-item').filter({ has: page.locator(`img[src="/${name}.png"], svg image[href="/${name}.png"]`) });
    await card.getByRole('button', { name: '60 coins' }).click();
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.meadow-dog')).toHaveCount(3);
  const startingPositions = await petPositions(page);
  await expect.poll(async () => {
    const positions = await petPositions(page);
    return Object.entries(startingPositions).every(([pet, [x, y]]) =>
      Math.hypot(positions[pet][0] - x, positions[pet][1] - y) > 2);
  }, { timeout: 9000 }).toBe(true);
  await page.getByRole('button', { name: 'Minimise companions' }).click();
  await page.getByRole('button', { name: 'Manage pets' }).click();
  await expect(page.getByRole('button', { name: 'Minimise companions' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#companion-panel')).toBeInViewport();
  const bob = page.locator('.pet-card').filter({ hasText: 'Bob' });
  await bob.getByRole('button', { name: 'Feed · +3 coins' }).click();
  await expect(page.getByLabel('3 coins', { exact: true })).toBeVisible();
  await bob.getByRole('button', { name: 'Remove from meadow' }).click();
  await expect(page.getByTestId('meadow-dog')).toHaveCount(0);
  await expect(bob).toContainText('In collection');
  await page.locator('.pet-card').filter({ hasText: 'Donut' }).getByRole('button', { name: 'Bring to meadow' }).click();
  await page.reload();
  await expect(page.getByTestId('meadow-hamster')).toBeVisible();
  await expect(page.getByTestId('meadow-dog')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('three-pets.png'), fullPage: true });
  for (const name of ['Cinnamon', 'Snowy', 'Donut']) {
    await page.locator('.pet-card').filter({ hasText: name }).getByRole('button', { name: 'Remove from meadow' }).click();
  }
  await expect(page.locator('.meadow-dog')).toHaveCount(0);
  await expect(page.locator('#companion-panel')).toContainText('No pets in the meadow');
  await bob.getByRole('button', { name: 'Bring to meadow' }).click();
  await page.reload();
  await expect(page.getByTestId('meadow-dog')).toBeVisible();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  if (info.project.name === 'mobile') await expect(page.getByLabel('Task name')).toHaveCSS('font-size', '16px');
});
