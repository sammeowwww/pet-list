import { expect, it } from 'vitest';
import { scopedTasks, unfinishedTasks, completedTasks, type TaskScope } from './taskView';
import { createTask, type Task } from './state';

const NOW = Date.parse('2026-10-06T00:00:00+08:00');
function task(overrides: Partial<Task>): Task { return { ...createTask({ title: 'Name', note: '', category: 'Work', assignedDay: null, deadline: null }, NOW), ...overrides }; }
const tasks = [task({ id: 'general' }), task({ id: 'progress', status: 'inprogress', category: 'Personal', note: 'Cat care' }), task({ id: 'dated', assignedDay: '2026-10-06' }), task({ id: 'due', deadline: '2026-10-07T12:00:00Z' }), task({ id: 'done', status: 'done', completedAt: NOW, reward: 5 }), task({ id: 'done-dated', category: 'Personal', assignedDay: '2026-10-06', status: 'done', completedAt: NOW, reward: 5 })];
it('combines scopes with both status filters, including completed general tasks', () => {
  const cases: [TaskScope, string[], string[]][] = [
    [{ kind: 'general' }, ['general', 'progress'], ['done']],
    [{ kind: 'all' }, ['general', 'progress', 'dated', 'due'], ['done', 'done-dated']],
    [{ kind: 'category', id: 'Work' }, ['general', 'dated', 'due'], ['done']],
    [{ kind: 'category', id: 'Personal' }, ['progress'], ['done-dated']],
  ];
  for (const [scope, pending, done] of cases) {
    const selected = scopedTasks(tasks, scope, '');
    expect(unfinishedTasks(selected).map(task => task.id)).toEqual(pending);
    expect(completedTasks(selected, NOW, true).map(task => task.id)).toEqual(done);
    expect(selected).toHaveLength(pending.length + done.length);
  }
  expect(scopedTasks(tasks, { kind: 'all' }, ' CAT ')).toEqual([tasks[1]]);
  expect(scopedTasks(tasks, { kind: 'category', id: 'Work' }, 'cat')).toHaveLength(0);
  expect(scopedTasks(tasks, { kind: 'general' }, 'NAME')).toHaveLength(3);
});
it('includes exactly 30 Singapore calendar days and retains older history in all time', () => {
  const records = ['2026-09-06T23:59:59+08:00', '2026-09-07T00:00:00+08:00', '2026-10-06T23:59:59+08:00', '2026-10-07T00:00:00+08:00'].map((date, index) => task({ id: String(index), status: 'done', completedAt: Date.parse(date), reward: 5 }));
  expect(completedTasks(records, NOW, true).map(task => task.id)).toEqual(['2', '1']);
  expect(completedTasks(records, NOW, false)).toHaveLength(4);
});
it('sorts undated unfinished work first then planned or deadline dates ascending', () => {
  const records = [task({ id: 'later', assignedDay: '2026-10-09' }), task({ id: 'due', deadline: '2026-10-06T16:00:00Z' }), task({ id: 'general' }), task({ id: 'first', assignedDay: '2026-10-06' })];
  expect(unfinishedTasks(records).map(task => task.id)).toEqual(['general', 'first', 'due', 'later']);
});
