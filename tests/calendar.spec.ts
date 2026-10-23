import { expect, test, type Page } from '@playwright/test';
import { createTask, emptyState, type AppState } from '../src/domain/state';

const NOW = Date.parse('2026-10-06T10:00:00+08:00');

async function openCalendar(page: Page, state: AppState) {
  await page.clock.install({ time: new Date(NOW) });
  await page.addInitScript((saved) => {
    localStorage.setItem('petlist:walkthrough:v1', 'seen');
    localStorage.setItem('little-by-little:v1', JSON.stringify(saved));
  }, state);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Today' })
    .click();
  await page.getByRole('button', { name: 'View calendar' }).click();
}

test('opens a complete month, selects dates, and keeps Today active', async ({
  page,
}, testInfo) => {
  const state = emptyState();
  state.tasks.push(
    createTask(
      {
        title:
          'A very long title that should be truncated in the calendar cell',
        note: '',
        category: 'Work',
        assignedDay: '2026-10-06',
        deadline: null,
      },
      NOW,
    ),
    createTask(
      {
        title: 'Another plan',
        note: '',
        category: 'Personal',
        assignedDay: '2026-10-06',
        deadline: null,
      },
      NOW,
    ),
    createTask(
      {
        title: 'Third plan',
        note: '',
        category: 'Work',
        assignedDay: '2026-10-06',
        deadline: null,
      },
      NOW,
    ),
    createTask(
      {
        title: 'Overdue carryover',
        note: '',
        category: 'Work',
        assignedDay: '2026-10-05',
        deadline: null,
      },
      NOW,
    ),
  );
  await openCalendar(page, state);
  await expect(
    page.getByRole('heading', { name: 'October 2026', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.month-calendar-day')).toHaveCount(35);
  await expect(
    page.getByRole('button', { name: /Tuesday, 6 October 2026, 3 tasks/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation').getByRole('button', { name: 'Today' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.month-calendar-carryovers')).toContainText(
    'Overdue carryover',
  );
  await page.getByRole('button', { name: /Wednesday, 7 October 2026/ }).click();
  await expect(page.locator('.month-calendar-carryovers')).toHaveCount(0);
  await page
    .locator('.month-calendar-list')
    .getByRole('button', { name: 'Add task' })
    .click();
  await page.getByLabel('Task name').fill('Plan from calendar');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Add to/ })
    .click();
  await expect(page.locator('.month-calendar-list')).toContainText(
    'Plan from calendar',
  );
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(
    page.getByRole('heading', { name: 'November 2026', exact: true }),
  ).toBeVisible();
  await page
    .locator('.month-calendar-controls')
    .getByRole('button', { name: 'Today' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'October 2026', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('month-calendar.png'),
    fullPage: true,
  });
});

test('keyboard date navigation and fluid phone layout', async ({
  page,
}, testInfo) => {
  await openCalendar(page, emptyState());
  await page.setViewportSize({ width: 768, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath('month-calendar-tablet.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 760 });
  const selected = page.getByRole('button', {
    name: /Tuesday, 6 October 2026/,
  });
  await selected.focus();
  await selected.press('ArrowRight');
  await expect(
    page.getByRole('button', { name: /Wednesday, 7 October 2026/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath('month-calendar-phone.png'),
    fullPage: true,
  });
});
