import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { exampleState } from '../src/domain/examples';
import { addDays, calendarDate, localDay, weekStart } from '../src/domain/dates';
import { createTask, emptyState, type AppState } from '../src/domain/state';

const NOW = Date.parse('2026-10-05T10:00:00+08:00');
const TODAY = localDay(NOW);

async function seed(page: Page, state: AppState) {
  await page.clock.install({ time: new Date(NOW) });
  await page.addInitScript(data => {
    if (sessionStorage.getItem('test-seeded')) return;
    localStorage.setItem('little-by-little:v1', JSON.stringify(data));
    sessionStorage.setItem('test-seeded', 'true');
  }, state);
  await page.goto('/');
}

async function addTask(page: Page, title: string, effort = 'small') {
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.getByLabel('Task name', { exact: true }).fill(title);

  await page.getByRole('dialog').getByRole('button', { name: /^Add to/ }).click();
}

async function finishTask(page: Page, title: string) {
  await page.getByRole('button', { name: `Start ${title}`, exact: true }).click();
  await page.getByRole('button', { name: `Complete ${title}`, exact: true }).click();
}

test('minimal form, progress, undo, rewards, shop and decorating survive reload', async ({ page }, testInfo) => {
  await seed(page, { ...emptyState(), coins: 10 });
  await expect(page.getByRole('heading', { name: 'Good morning.' })).toBeVisible();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.locator('.optional-details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Task name')).toBeFocused();
  await expect(page.getByLabel('Plan for')).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('task-form.png') });
  await page.getByLabel('Task name').fill('Finish my first draft');
  await page.locator('summary').click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: /^Add to/ }).click();
  await page.getByRole('button', { name: 'Start Finish my first draft' }).click();
  await expect(page.locator('.task-row.progress')).toContainText('Finish my first draft');
  await page.getByRole('button', { name: 'Complete Finish my first draft' }).click();
  await expect(page.getByTestId('meadow-scene')).toHaveClass(/celebrating/);
  await expect(page.getByTestId('celebration-flowers')).toBeVisible();
  await page.getByRole('button', { name: /^Undo ·/ }).click();
  await expect(page.getByTestId('celebration-flowers')).toHaveCount(0);
  await expect(page.locator('.task-row.progress')).toContainText('Finish my first draft');
  await page.reload();
  await expect(page.locator('.task-row.progress')).toContainText('Finish my first draft');
  await page.getByRole('navigation').getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Finish my first draft' }).click();
  await expect(page.locator('.tasks-page')).toBeVisible();
  await page.clock.runFor(4000);
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('celebration-flowers')).toBeVisible();
  await page.clock.runFor(6000);
  await expect(page.getByTestId('celebration-flowers')).toHaveCount(0);
  await expect(page.getByLabel('15 coins', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Claim daily bonus' }).click();
  await expect(page.getByLabel('25 coins', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Decorations', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Cozy bed for 20 coins' }).click();
  await expect(page.getByRole('button', { name: 'Cozy bed owned' })).toBeDisabled();
  await page.getByRole('button', { name: 'Decorate your meadow →' }).click();
  await page.getByRole('button', { name: 'Cozy bed', exact: true }).click();
  await page.getByRole('button', { name: 'Place Cozy bed at column 7, row 3' }).click();
  await expect(page.getByTestId('placed-bed')).toBeVisible();
  await page.getByRole('button', { name: 'Finish decorating' }).click();
  await page.reload();
  await expect(page.getByTestId('placed-bed')).toBeVisible();
  await expect(page.getByLabel('5 coins', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
});

test('weekly dates, optional deadline, edit, backlog and completion-date history', async ({ page }, testInfo) => {
  const state = exampleState(NOW);
  const lastTuesday = addDays(weekStart(TODAY), -6);
  const previous = createTask({ title: 'A win from last Tuesday', assignedDay: addDays(TODAY, -4), deadline: null, effort: 'small', category: 'Wellbeing', note: '' }, NOW);
  state.tasks.push({ ...previous, status: 'done', completedAt: calendarDate(lastTuesday).getTime(), reward: 5 });
  await seed(page, state);
  await page.getByRole('navigation').getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Monday’s tasks' })).toBeVisible();
  await page.getByRole('button', { name: 'Wednesday 7 October', exact: true }).click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.getByLabel('Task name').fill('Wednesday review');
  await page.getByLabel('Category', { exact: true }).selectOption('Health');
  await page.locator('summary').click();
  await page.getByLabel('Time', { exact: true }).fill('18:00');
  await expect(page.getByText(/Due 5 Oct.*18:00.*Singapore time/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /^Add to/ }).click();
  await expect(page.locator('.task-row').filter({ hasText: 'Wednesday review' })).toBeVisible();
  await page.getByRole('button', { name: 'Options for Wednesday review' }).click();
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  await page.getByLabel('Task name').fill('Review the revised project');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('week.png'), fullPage: true });
  await page.getByRole('navigation').getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  await expect(page.locator('.history-day').filter({ hasText: /Tuesday,? 29 September/ })).toContainText('A win from last Tuesday');
  await expect(page.locator('.history-card')).toContainText('Make a little progress');
  await expect(page.locator('.task-row').filter({ hasText: 'Read a chapter' })).toContainText('To do');
  await expect(page.locator('.task-row').filter({ hasText: 'Make a little progress' })).toContainText('In progress');
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.history-card')).not.toContainText('Make a little progress');
  await page.getByRole('navigation').getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: /^General/ }).click();
  await addTask(page, 'An idea for later');
  await expect(page.locator('.task-row').filter({ hasText: 'An idea for later' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByRole('button', { name: 'Monday 28 September' })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
});

test('repeated completions extend celebration to exactly ten seconds after the latest', async ({ page }) => {
  const state = emptyState();
  for (const title of ['First little step', 'Second little step']) state.tasks.push(createTask({ title, assignedDay: TODAY, deadline: null, category: 'Personal', effort: 'small', note: '' }, NOW));
  await seed(page, state);
  await finishTask(page, 'First little step');
  await page.clock.runFor(4000);
  await finishTask(page, 'Second little step');
  await page.clock.runFor(6100);
  await expect(page.getByTestId('meadow-scene')).toHaveClass(/celebrating/);
  await expect(page.getByTestId('celebration-flowers')).toBeVisible();
  await page.clock.runFor(4000);
  await expect(page.getByTestId('celebration-flowers')).toHaveCount(0);
  await expect(page.getByTestId('meadow-scene')).not.toHaveClass(/celebrating/);
  await expect(page.getByLabel('10 coins', { exact: true })).toBeVisible();
});

test('legacy progress, purchased decorations and backup export/import stay compatible', async ({ page }) => {
  const state = exampleState(NOW);
  state.coins = 100;
  state.owned = ['bed'];
  state.placements = { bed: { column: 6, row: 2 } };
  await seed(page, state);
  await expect(page.getByLabel('100 coins', { exact: true })).toBeVisible();
  await expect(page.getByTestId('placed-bed')).toBeVisible();
  await page.getByRole('button', { name: 'Settings and backups' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  const contents = await readFile((await download.path())!);
  expect(JSON.parse(contents.toString())).toEqual(state);
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Decorations', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Little plant for 40 coins' }).click();
  await expect(page.getByLabel('60 coins', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings and backups' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('input[type=file]').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: contents });
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('100 coins', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Decorations', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Buy Little plant for 40 coins' })).toBeEnabled();
});

test('dog paces, pauses while decorating and hidden, and honors reduced motion', async ({ page }) => {
  await seed(page, exampleState(NOW));
  await page.getByRole('button', { name: 'Feed Bob', exact: true }).click();
  const dog = page.getByTestId('meadow-dog');
  const before = await dog.getAttribute('data-x');
  await page.clock.runFor(4000);
  expect(await dog.getAttribute('data-x')).not.toBe(before);
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  const frozen = await dog.getAttribute('data-x');
  await page.clock.runFor(2000);
  await expect(dog).toHaveAttribute('data-motion', 'paused');
  await expect(dog).toHaveAttribute('data-x', frozen!);
  await page.getByRole('button', { name: 'Finish decorating' }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await dog.getAttribute('data-x');
  await page.clock.runFor(1000);
  await expect(dog).toHaveAttribute('data-motion', 'paused');
  await expect(dog).toHaveAttribute('data-x', hidden!);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Complete Make a little progress on the project' }).click();
  await expect(dog).toHaveAttribute('data-motion', 'paused');
  await expect(page.getByTestId('celebration-flowers')).toHaveClass(/static/);
  await expect(page.locator('.meadow-dog-body')).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(10_100);
  await expect(page.getByTestId('celebration-flowers')).toHaveCount(0);
});

test('corrupt data is preserved, invalid import is rejected, and fonts load locally', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('little-by-little:v1', 'not-json'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  expect(await page.evaluate(() => localStorage.getItem('little-by-little:v1'))).toBe('not-json');
  await page.getByRole('button', { name: 'Settings and backups' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":42}') });
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not be imported');
  expect(await page.evaluate(() => localStorage.getItem('little-by-little:v1'))).toBe('not-json');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 24px "Pixelify Sans"'))).toBe(true);
  await expect(page.locator('h1')).toHaveCSS('font-family', /Pixelify Sans/);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.getByLabel('Task name').press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
