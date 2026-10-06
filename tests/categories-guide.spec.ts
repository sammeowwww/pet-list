import { test, expect, type Page } from '@playwright/test';
import { createTask, emptyState, type AppState, type Task } from '../src/domain/state';
const NOW = Date.parse('2026-10-06T10:00:00+08:00');
async function seed(page: Page, state = emptyState(), welcome = false) {
  await page.clock.install({ time: new Date(NOW) });
  await page.addInitScript(({ state, welcome }) => {
    if (sessionStorage.getItem('catalog-seeded')) return;
    localStorage.setItem('little-by-little:v1', JSON.stringify(state));
    if (!welcome) localStorage.setItem('petlist:walkthrough:v1', 'seen');
    sessionStorage.setItem('catalog-seeded', 'yes');
  }, { state, welcome });
  await page.goto('/');
}
function task(title: string, category = 'Personal', overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title, category, note: '', assignedDay: null, deadline: null }, NOW), ...overrides };
}
const nav = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true });
test('every task list reorders immediately on start, completion and undo, including Home previews', async ({ page }, info) => {
  const state = emptyState();
  const planned = { assignedDay: '2026-10-06' };
  state.tasks = [
    task('Ongoing plan', 'Work', { ...planned, status: 'inprogress', createdAt: NOW - 20 }),
    task('Finished plan', 'Work', { ...planned, status: 'done', completedAt: NOW - 10, reward: 5 }),
    task('First plan', 'Work', { ...planned, createdAt: NOW - 2 }),
    task('Second plan', 'Work', planned),
    task('Ongoing idea', 'Personal', { status: 'inprogress', createdAt: NOW - 20 }),
    ...Array.from({ length: 5 }, (_, index) => task(`Idea ${index + 1}`, 'Personal', { createdAt: NOW + index })),
  ];
  await seed(page, state);
  const homeRows = page.locator('.today-card .task-row h3');
  const original = ['First plan', 'Second plan', 'Ongoing plan', 'Finished plan'];
  await expect(homeRows).toHaveText(original);
  await expect(page.locator('.general-card .task-row h3')).toHaveText(['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4', 'Idea 5']);
  await page.getByRole('button', { name: 'Start First plan', exact: true }).click();
  await expect(homeRows).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await page.getByRole('button', { name: 'Complete First plan', exact: true }).click();
  await expect(homeRows).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await page.locator('.today-card .task-row').filter({ hasText: 'First plan' }).getByRole('button', { name: /^Undo/ }).click();
  await expect(page.locator('.today-card .task-row.progress h3')).toHaveText(['Ongoing plan', 'First plan']);
  await page.screenshot({ path: info.outputPath('home-status-order.png'), fullPage: true });
  await nav(page, 'Today').click();
  const dailyRows = page.locator('.planner-card .task-row h3');
  await expect(dailyRows).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await page.getByRole('button', { name: 'Complete Ongoing plan', exact: true }).click();
  await expect(dailyRows).toHaveText(['Second plan', 'First plan', 'Ongoing plan', 'Finished plan']);
  await page.locator('.planner-card .task-row').filter({ hasText: 'Ongoing plan' }).getByRole('button', { name: /^Undo/ }).click();
  await expect(dailyRows).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await page.getByRole('button', { name: /^General/ }).click();
  await expect(dailyRows).toHaveText(['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Ongoing idea']);
  await page.getByRole('button', { name: 'Start Idea 1', exact: true }).click();
  await expect(dailyRows).toHaveText(['Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Ongoing idea', 'Idea 1']);
  await nav(page, 'Tasks').click();
  await expect(page.locator('.history-day').filter({ hasText: 'Tuesday, 6 October' }).locator('.task-row h3')).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await page.reload();
  await expect(homeRows).toHaveText(['Second plan', 'Ongoing plan', 'First plan', 'Finished plan']);
  await expect(page.locator('.general-card .task-row h3')).toHaveText(['Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Ongoing idea']);
});

test('scopes preserve completion filters and search; history and unfinished work paginate independently', async ({ page }, info) => {
  const state = emptyState();
  for (const category of state.categories) state.tasks.push(task(`${category.name} pending`, category.id), task(`${category.name} flexible win`, category.id, { status: 'done', completedAt: NOW, reward: 5 }), task(`${category.name} dated win`, category.id, { status: 'done', completedAt: NOW, reward: 5, assignedDay: '2026-10-06' }));
  state.tasks.push(task('Archived memory', 'Personal', { status: 'done', completedAt: Date.parse('2026-08-01T12:00:00+08:00'), reward: 5 }));
  state.tasks.push(task('Later work', 'Work', { assignedDay: '2026-10-09' }), task('Earlier work', 'Work', { deadline: '2026-10-07T12:00:00Z' }));
  state.tasks.push(...Array.from({ length: 26 }, (_, index) => task(`Flexible idea ${index + 1}`)));
  await seed(page, state);
  await page.locator('.general-card').getByRole('button', { name: 'View all →' }).click();
  await expect(page.getByLabel('Task scope')).toHaveValue('general');
  await expect(page.getByRole('button', { name: 'All tasks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.task-row.todo')).toHaveCount(25);
  await expect(page.getByRole('switch', { name: 'Show completed' })).toBeChecked();
  await expect(page.locator('.completed-section')).toHaveCount(0);
  await expect(page.locator('.task-row.done')).toHaveCount(7);
  await page.getByRole('button', { name: /^Show more/ }).click();
  await expect(page.locator('.task-row.todo')).toHaveCount(32);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(6);
  for (const category of state.categories) {
    await page.getByLabel('Task scope').selectOption(`category:${category.id}`);
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.task-row')).toHaveCount(2);
  }
  await page.getByLabel('Search tasks').fill('archived');
  await page.getByLabel('Task scope').selectOption('all');
  await expect(page.getByLabel('Search tasks')).toHaveValue('archived');
  await expect(page.locator('.task-row')).toHaveCount(0);
  await page.getByLabel('Completed date range').selectOption('all');
  await expect(page.locator('.task-row')).toContainText('Archived memory');
  await page.getByLabel('Search tasks').fill('');
  await expect(page.locator('.task-row')).toHaveCount(13);
  await page.getByRole('button', { name: 'All tasks', exact: true }).click();
  await expect(page.locator('.task-row.todo')).toHaveCount(25);
  await page.getByRole('button', { name: /^Show more unfinished/ }).click();
  await expect(page.locator('.task-row.todo')).toHaveCount(34);
  await expect(page.locator('.history-day').filter({ hasText: 'Wednesday, 7 October' })).toContainText('Earlier work');
  await page.getByLabel('Task scope').selectOption('category:Work');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('tasks-filters.png'), fullPage: true });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
  await page.getByRole('button', { name: 'Add general task' }).click();
  await page.locator('.optional-details > summary').click();
  await expect(page.getByLabel('Plan for')).toHaveValue('');
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Personal');
});
test('editable categories preserve badges and progress, default category and old backups', async ({ page }, info) => {
  const state = emptyState(); state.coins = 23;
  state.tasks = [task('A work plan', 'Work'), task('Personal completed', 'Personal', { status: 'done', completedAt: NOW, reward: 5 })];
  await seed(page, state);
  await nav(page, 'Settings').click();
  await page.getByRole('button', { name: 'Add category', exact: true }).click();
  await page.getByLabel('Category name').fill('  Studies  ');
  await page.getByRole('button', { name: 'Save category' }).click();
  await page.getByRole('button', { name: 'Rename Studies' }).click();
  await page.getByLabel('Category name').fill('PERSONAL');
  await page.getByRole('button', { name: 'Save category' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('already exists');
  await page.getByLabel('Category name').fill('Learning');
  await page.getByRole('button', { name: 'Save category' }).click();
  await page.getByRole('button', { name: 'Rename Work' }).click();
  await page.getByLabel('Category name').fill('Career');
  await page.getByRole('button', { name: 'Save category' }).click();
  await page.getByLabel('Default task category').selectOption({ label: 'Career' });
  await page.getByRole('button', { name: 'Remove Career' }).click();
  await page.getByLabel('Replacement category').selectOption({ label: 'Learning' });
  await page.getByRole('button', { name: 'Move tasks and remove' }).click();
  await expect(page.getByLabel('Default task category').locator('option:checked')).toHaveText('Learning');
  await expect(page.getByLabel('23 coins', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('settings-categories.png'), fullPage: true });
  await page.reload();
  await nav(page, 'Tasks').click();
  await page.getByLabel('Task scope').selectOption({ label: 'Learning' });
  await expect(page.locator('.task-row .category')).toHaveClass(/personal/);
  await expect(page.locator('.task-row .category')).toHaveText('Learning');
  await nav(page, 'Settings').click();
  const { categories: _, ...old } = { ...state, version: 3 };
  page.once('dialog', dialog => dialog.accept());
  await page.locator('input[type=file]').setInputFiles({ name: 'v3.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) });
  await expect(page.getByRole('button', { name: 'Rename Work' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rename Learning' })).toHaveCount(0);
  await expect(page.getByLabel('23 coins', { exact: true })).toBeVisible();
});
test('companion collapse persists and meadow feeding stays available', async ({ page }, info) => {
  await seed(page);
  await page.getByRole('button', { name: 'Minimise companions' }).click();
  await expect(page.locator('.pet-controls')).not.toBeVisible();
  await expect(page.locator('.hunger-summary')).toHaveText('1 pet is hungry');
  await page.getByRole('button', { name: 'Feed Bob', exact: true }).click();
  await expect(page.locator('.hunger-summary')).toHaveText('All meadow pets are satisfied');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand companions' })).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: info.outputPath('home-collapsed.png'), fullPage: true });
  await page.getByRole('button', { name: 'Expand companions' }).click();
  await expect(page.getByRole('button', { name: 'Fed today' })).toBeVisible();
});
test('first-use illustrated tour, keyboard dismissal and replay never mutate the planner or tab', async ({ page }, info) => {
  const state = emptyState(); state.tasks = [task('Keep this task')];
  await seed(page, state, true);
  await expect(page.getByRole('dialog', { name: 'Welcome to PetList' })).toBeVisible();
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  await expect(touch ? page.getByRole('dialog') : page.getByRole('button', { name: 'Start tour' })).toBeFocused();
  await page.getByRole('button', { name: 'Start tour' }).press('Enter');
  await expect(page.getByLabel('Step 1 of 8')).toBeVisible();
  await expect(touch ? page.getByRole('dialog') : page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath('walkthrough.png'), fullPage: true });
  for (let step = 1; step < 8; step++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByLabel(`Step ${step + 1} of 8`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Step 7 of 8')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(nav(page, 'Home')).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('little-by-little:v1')!))).toEqual(state);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await nav(page, 'Settings').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Replay walkthrough' }).click();
  await expect(page.getByLabel('Step 1 of 8')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(nav(page, 'Settings')).toHaveAttribute('aria-current', 'page');
});

test('completed and unfinished sections have separate show-more controls', async ({ page }) => {
  const state = emptyState();
  state.tasks = [...Array.from({ length: 28 }, (_, index) => task(`Pending ${index}`)), ...Array.from({ length: 53 }, (_, index) => task(`Completed ${index}`, 'Personal', { status: 'done', completedAt: NOW - index * 1000, reward: 5 }))];
  await seed(page, state);
  await nav(page, 'Tasks').click();
  await expect(page.getByRole('switch', { name: 'Show completed' })).toBeChecked();
  await expect(page.locator('.task-row.done')).toHaveCount(25);
  await expect(page.locator('.task-row.todo')).toHaveCount(25);
  await page.getByRole('button', { name: /^Show more completed/ }).click();
  await expect(page.locator('.task-row.done')).toHaveCount(50);
  await expect(page.locator('.task-row.todo')).toHaveCount(25);
  await page.getByRole('button', { name: /^Show more unfinished/ }).click();
  await expect(page.locator('.task-row.todo')).toHaveCount(28);
  await expect(page.locator('.task-row.done')).toHaveCount(50);
  await page.getByRole('button', { name: /^Show more completed/ }).click();
  await expect(page.locator('.task-row.done')).toHaveCount(53);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(25);
  await page.getByRole('button', { name: /^Show more/ }).click();
  await expect(page.locator('.task-row')).toHaveCount(50);
});
test('skipping the welcome persists and keyboard focus stays inside a replay', async ({ page }) => {
  await seed(page, emptyState(), true);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await nav(page, 'Settings').click();
  await page.getByRole('button', { name: 'Replay walkthrough' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).press('Tab');
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.getByRole('button', { name: 'Close dialog' }).press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Next', exact: true }).press('Escape');
  await expect(page.getByRole('button', { name: 'Replay walkthrough' })).toBeFocused();
});

test('walkthrough blocks background taps and page scrolling, then restores the page', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => window.scrollTo(0, 250));
  await page.getByRole('button', { name: 'Settings and backups' }).click();
  const replay = page.getByRole('button', { name: 'Replay walkthrough' });
  await replay.scrollIntoViewIfNeeded();
  const previousScroll = await page.evaluate(() => scrollY);
  await replay.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.bottom-nav')).toHaveAttribute('inert', '');
  await expect(page.locator('.topbar')).toHaveAttribute('inert', '');
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (touch) {
    await expect(page.getByRole('dialog')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).not.toBeFocused();
  }
  const home = page.locator('.bottom-nav .home-button');
  const point = await home.boundingBox();
  if (touch) await page.touchscreen.tap(point!.x + point!.width / 2, point!.y + point!.height / 2);
  else await page.mouse.click(point!.x + point!.width / 2, point!.y + point!.height / 2);
  await expect(page.locator('.bottom-nav button.active')).toContainText('Settings');
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
  await page.getByRole('button', { name: 'Next', exact: true }).press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).not.toHaveAttribute('inert');
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');
  expect(await page.evaluate(() => scrollY)).toBe(previousScroll);
  await nav(page, 'Home').click();
  await expect(nav(page, 'Home')).toHaveAttribute('aria-current', 'page');
});

test('input focus and touch taps keep their normal border without a glow', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  const title = page.getByLabel('Task name');
  await expect(title).toBeFocused();
  await expect(title).toHaveCSS('outline-style', 'none');
  await expect(title).toHaveCSS('box-shadow', 'none');
  await expect(title).toHaveCSS('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)');
  const border = await title.evaluate(element => getComputedStyle(element).border);
  await page.getByLabel('Category', { exact: true }).focus();
  await expect(page.getByLabel('Category', { exact: true })).toHaveCSS('outline-style', 'none');
  await title.click();
  expect(await title.evaluate(element => getComputedStyle(element).border)).toBe(border);
  await title.fill('A normal-looking input');
  await page.locator('.optional-details > summary').click();
  await page.getByLabel('Notes').click();
  await expect(page.getByLabel('Notes')).toHaveCSS('outline-style', 'none');
  await page.getByLabel('Notes').fill('Typing still works');
  await page.getByRole('button', { name: /^Add to/ }).click();
  await expect(page.locator('.task-row')).toContainText('A normal-looking input');
});

test('default combined view groups each day once, orders statuses and toggles completed work', async ({ page }, info) => {
  const state = emptyState();
  state.tasks = [task('Ongoing Tuesday', 'Personal', { assignedDay: '2026-10-06', status: 'inprogress' }), task('Finished Tuesday', 'Work', { assignedDay: '2026-10-05', status: 'done', completedAt: NOW, reward: 5 }), task('To do Tuesday', 'Work', { assignedDay: '2026-10-06' }), task('General idea'), task('Later Wednesday', 'Personal', { assignedDay: '2026-10-07' })];
  await seed(page, state);
  await nav(page, 'Tasks').click();
  await expect(page.getByLabel('Task scope')).toHaveValue('all');
  const toggle = page.getByRole('switch', { name: 'Show completed' });
  await expect(toggle).toBeChecked();
  const tuesday = page.locator('.history-day').filter({ has: page.getByRole('heading', { name: 'Tuesday, 6 October 2026', exact: true }) });
  await expect(tuesday).toHaveCount(1);
  await expect(tuesday.locator('.task-row h3')).toHaveText(['To do Tuesday', 'Ongoing Tuesday', 'Finished Tuesday']);
  await expect(page.getByRole('heading', { name: 'Monday, 5 October 2026', exact: true })).toHaveCount(0);
  await toggle.press('Space');
  await expect(page.locator('.task-row.done')).toHaveCount(0);
  await page.getByLabel('Task scope').selectOption('category:Work');
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('.task-row')).toHaveCount(1);
  await toggle.press('Space');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(tuesday).toHaveCount(1);
  await page.getByLabel('Search tasks').fill('Tuesday');
  await page.getByLabel('Task scope').selectOption('all');
  await expect(page.getByLabel('Search tasks')).toHaveValue('Tuesday');
  const heading = await page.getByRole('heading', { name: 'Tasks', exact: true }).boundingBox();
  const add = await page.getByRole('button', { name: 'Add general task' }).boundingBox();
  if (!heading || !add) throw new Error('Tasks heading and Add task button must be visible.');
  expect(add.y).toBeGreaterThan(heading.y + heading.height);
  expect(Math.abs((heading.x + heading.width / 2) - (add.x + add.width / 2))).toBeLessThan(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('combined-tasks.png'), fullPage: true });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(body => body.clientWidth));
  await page.reload();
  await nav(page, 'Tasks').click();
  await expect(page.getByLabel('Task scope')).toHaveValue('all');
  await expect(toggle).toBeChecked();
  await nav(page, 'Home').click();
  await page.locator('.general-card').getByRole('button', { name: 'View all →' }).click();
  await expect(page.getByLabel('Task scope')).toHaveValue('general');
});
