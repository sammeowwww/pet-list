import { expect, it } from 'vitest';
import {
  calendarTaskDay,
  calendarTasksByDay,
  monthDays,
  moveMonth,
  overdueCalendarTasks,
} from './monthCalendar';
import { createTask, type Task } from './state';

const NOW = Date.parse('2026-10-06T12:00:00+08:00');

function task(overrides: Partial<Task>): Task {
  return {
    ...createTask(
      {
        title: 'Task',
        note: '',
        category: 'Personal',
        assignedDay: null,
        deadline: null,
      },
      NOW,
    ),
    ...overrides,
  };
}

it('fills complete Monday-to-Sunday weeks across month, year, and leap boundaries', () => {
  const october = monthDays('2026-10-06');
  expect(october[0]).toBe('2026-09-28');
  expect(october.at(-1)).toBe('2026-11-01');
  expect(october).toHaveLength(35);
  const leap = monthDays('2024-02-15');
  expect(leap[0]).toBe('2024-01-29');
  expect(leap.at(-1)).toBe('2024-03-03');
  expect(leap).toContain('2024-02-29');
  expect(moveMonth('2024-01-31', 1)).toBe('2024-02-29');
  expect(moveMonth('2026-12-31', 1)).toBe('2027-01-31');
});

it('places each task once using deadline precedence or Singapore completion day', () => {
  const records = [
    task({ id: 'general' }),
    task({
      id: 'completed-general',
      status: 'done',
      completedAt: NOW,
      reward: 5,
    }),
    task({ id: 'planned', assignedDay: '2026-10-06' }),
    task({
      id: 'deadline',
      assignedDay: '2026-10-06',
      deadline: '2026-10-07T12:00:00Z',
    }),
    task({
      id: 'repeat-occurrence',
      seriesId: 'series',
      assignedDay: '2026-10-08',
    }),
    task({
      id: 'done',
      status: 'done',
      assignedDay: '2026-10-05',
      completedAt: Date.parse('2026-10-06T16:00:00Z'),
      reward: 5,
    }),
  ];
  const groups = calendarTasksByDay(records);
  expect(calendarTaskDay(records[0])).toBeNull();
  expect(calendarTaskDay(records[1])).toBeNull();
  expect([...groups.keys()]).toEqual([
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
  ]);
  expect(groups.get('2026-10-06')?.map((item) => item.id)).toEqual(['planned']);
  expect(groups.get('2026-10-07')?.map((item) => item.id)).toEqual([
    'deadline',
    'done',
  ]);
  expect(groups.get('2026-10-08')?.map((item) => item.id)).toEqual([
    'repeat-occurrence',
  ]);
});

it('sorts each date todo, in progress, completed and separates overdue carryovers', () => {
  const records = [
    task({
      id: 'done',
      assignedDay: '2026-10-04',
      status: 'done',
      completedAt: NOW,
      reward: 5,
    }),
    task({ id: 'progress', assignedDay: '2026-10-06', status: 'inprogress' }),
    task({ id: 'todo', assignedDay: '2026-10-06' }),
    task({ id: 'overdue', assignedDay: '2026-10-05' }),
    task({ id: 'general' }),
  ];
  expect(
    calendarTasksByDay(records)
      .get('2026-10-06')
      ?.map((item) => item.id),
  ).toEqual(['todo', 'progress', 'done']);
  expect(
    overdueCalendarTasks(records, '2026-10-06').map((item) => item.id),
  ).toEqual(['overdue']);
});
