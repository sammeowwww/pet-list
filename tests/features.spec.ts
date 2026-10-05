import { test, expect, type Page } from '@playwright/test';
import { createTask, emptyState } from '../src/domain/state';
const NOW = Date.parse('2026-10-06T10:00:00+08:00');
async function seed(page: Page, three = false) {
  const state = emptyState();
  state.tasks = [createTask({ title: 'Flexible idea', note: '', category: 'Personal', assignedDay: null, deadline: null }, NOW)];
  if (three) { state.pets.owned = ['dog', 'cat', 'bunny', 'hamster']; state.pets.active = ['dog', 'cat', 'bunny']; }
  await page.clock.install({ time: new Date(NOW) });
  await page.addInitScript(data => { if (!sessionStorage.getItem('features-seeded')) { localStorage.setItem('little-by-little:v1', JSON.stringify(data)); sessionStorage.setItem('features-seeded', 'yes'); } }, state);
  await page.goto('/');
}
test('General, default category, recurrence, scheduling and deletion work together', async ({ page }, info) => {
  await seed(page);
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Week', exact: true })).toHaveCount(0);
  await expect(page.locator('.general-card')).toContainText('Flexible idea');
  await page.locator('.general-card').getByRole('button', { name: 'View all →' }).click();
  await expect(page.getByRole('button', { name: 'General', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Default task category').selectOption('Home');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Add general task' }).click();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Home');
  await page.getByLabel('Task name').fill('Morning routine');
  await page.locator('summary').click();
  await expect(page.getByLabel('Plan for')).toHaveValue('');
  await page.getByLabel('Repeat', { exact: true }).selectOption('selected');
  await expect(page.getByLabel('Start date')).toHaveValue('2026-10-06');
  await expect(page.getByRole('button', { name: /^Add to/ })).toBeDisabled();
  await page.getByLabel('Tue', { exact: true }).check();
  await page.getByLabel('Thu', { exact: true }).check();
  await page.getByLabel('Time', { exact: true }).fill('18:00');
  await page.screenshot({ path: info.outputPath('repeat-form.png'), fullPage: true });
  await page.getByRole('button', { name: /^Add to/ }).click();
  await expect(page.locator('.history-card')).not.toContainText('Morning routine');
  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Start Morning routine' }).click();
  await page.getByRole('button', { name: 'Complete Morning routine' }).click();
  await page.clock.runFor(10000);
  await expect(page.getByLabel('5 coins', { exact: true })).toBeVisible();
  const nextId = await page.locator('.task-row').filter({ has: page.getByRole('button', { name: 'Start Morning routine' }) }).getAttribute('data-task-id');
  const next = page.locator(`[data-task-id="${nextId}"]`);
  await expect(next).toContainText('Upcoming');
  await page.getByRole('button', { name: 'Start Morning routine' }).click();
  await expect(page.getByRole('button', { name: 'Complete Morning routine' })).toBeDisabled();
  await next.getByRole('button', { name: 'Options for Morning routine' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('repetition will stop');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete task' }).click();
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(1);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(page.locator('.history-card')).toContainText('Flexible idea');
  await page.getByRole('button', { name: 'Options for Flexible idea' }).click();
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Personal');
  await page.locator('summary').click();
  await page.getByLabel('Plan for').fill('2026-10-06');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.history-card')).not.toContainText('Flexible idea');
});

test('hungry pets feed by keyboard and tap, hearts expire independently and bubbles fit', async ({ page }, info) => {
  await seed(page, true);
  await expect(page.locator('.pet-bubble')).toHaveCount(3);
  const scene = await page.getByTestId('meadow-scene').boundingBox();
  const targets = await page.locator('.pet-feed-target').all();
  const boxes = [];
  for (const target of targets) {
    const box = (await target.boundingBox())!; boxes.push(box); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) expect(boxes[a].x + boxes[a].width <= boxes[b].x || boxes[b].x + boxes[b].width <= boxes[a].x).toBe(true);
  for (const bubble of await page.locator('.pet-bubble').all()) { const b = (await bubble.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(scene!.x); expect(b.y).toBeGreaterThanOrEqual(scene!.y); expect(b.x + b.width).toBeLessThanOrEqual(scene!.x + scene!.width); }
  const before = await page.getByTestId('meadow-dog').getAttribute('data-x');
  await page.clock.runFor(4000);
  await expect(page.getByTestId('meadow-dog')).toHaveAttribute('data-x', before!);
  await expect(page.getByTestId('meadow-dog')).toHaveAttribute('data-motion', 'hungry');
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Feed Bob', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Finish decorating' }).click();
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Feed Bob', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Feed Bob', exact: true })).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bubble-dog')).toHaveAttribute('data-bubble', 'heart');
  await page.clock.runFor(4000);
  const cinnamon = page.getByRole('button', { name: 'Feed Cinnamon', exact: true });
  if (info.project.name === 'mobile') await cinnamon.tap(); else await cinnamon.click();
  await expect(page.getByTestId('bubble-cat')).toHaveAttribute('data-bubble', 'heart');
  const catBox = (await page.getByTestId('meadow-cat').boundingBox())!;
  await page.mouse.click(catBox.x + catBox.width / 2, catBox.y + catBox.height / 2);
  await expect(page.getByLabel('6 coins', { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Feed Snowy', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('bubble-bunny')).toHaveAttribute('data-bubble', 'heart');
  await expect(page.getByTestId('meadow-bunny')).toHaveAttribute('data-motion', 'paused');
  await page.screenshot({ path: info.outputPath('pet-hearts.png'), fullPage: true });
  await page.clock.runFor(6100);
  await expect(page.getByTestId('bubble-dog')).toHaveCount(0);
  await expect(page.getByTestId('bubble-cat')).toHaveAttribute('data-bubble', 'heart');
  await page.clock.runFor(4000);
  await expect(page.locator('.pet-bubble')).toHaveCount(0);
  await expect(page.getByLabel('9 coins', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.pet-bubble')).toHaveCount(0);
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await expect(page.getByTestId('bubble-dog')).toHaveAttribute('data-bubble', 'hunger');
  const hungryTargets = await page.locator('.pet-feed-target').all();
  const hungryBoxes = await Promise.all(hungryTargets.map(target => target.boundingBox()));
  for (let a = 0; a < hungryBoxes.length; a++) for (let b = a + 1; b < hungryBoxes.length; b++) {
    const one = hungryBoxes[a]!; const two = hungryBoxes[b]!;
    expect(one.x + one.width <= two.x || two.x + two.width <= one.x).toBe(true);
  }
});
