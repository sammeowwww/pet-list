import { expect, it } from 'vitest';
import { scopedTasks, unfinishedTasks, completedTasks, taskGroups, sortTasksByStatus, type TaskScope } from './taskView';
import { createTask, type Task } from './state';

const NOW = Date.parse('2026-10-06T00:00:00+08:00');
function task(overrides: Partial<Task>): Task { return { ...createTask({ title: 'Name', note: '', category: 'Work', assignedDay: null, deadline: null }, NOW), ...overrides }; }
const tasks = [task({ id: 'general' }), task({ id: 'progress', status: 'inprogress', category: 'Personal', note: 'Cat care' }), task({ id: 'dated', assignedDay: '2026-10-06' }), task({ id: 'due', deadline: '2026-10-07T12:00:00Z' }), task({ id: 'done', status: 'done', completedAt: NOW, reward: 5 }), task({ id: 'done-dated', category: 'Personal', assignedDay: '2026-10-06', status: 'done', completedAt: NOW, reward: 5 })];
it('combines scopes with both status filters, including completed general tasks', () => {
  const cases: [TaskScope, string[], string[]][] = [
    [{ kind: 'general' }, ['general', 'progress'], ['done']],
    [{ kind: 'all' }, ['general', 'progress', 'due', 'dated'], ['done', 'done-dated']],
    [{ kind: 'category', id: 'Work' }, ['general', 'due', 'dated'], ['done']],
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
it('sorts undated unfinished work first then planned or deadline dates newest first', () => {
  const records = [task({ id: 'later', assignedDay: '2026-10-09' }), task({ id: 'due', deadline: '2026-10-06T16:00:00Z' }), task({ id: 'general' }), task({ id: 'first', assignedDay: '2026-10-06' })];
  expect(unfinishedTasks(records).map(task => task.id)).toEqual(['general', 'later', 'due', 'first']);
});

it('merges statuses under one completion/planned day and ranks to-do, ongoing, then completed', () => {
  const records = [task({ id: 'done', status: 'done', completedAt: NOW, assignedDay: '2026-10-05', reward: 5 }), task({ id: 'ongoing', status: 'inprogress', assignedDay: '2026-10-06' }), task({ id: 'todo', assignedDay: '2026-10-06' }), task({ id: 'undated' }), task({ id: 'tomorrow', assignedDay: '2026-10-07' })];
  const groups = taskGroups(records);
  expect(groups.map(group => group.day)).toEqual([null, '2026-10-07', '2026-10-06']);
  expect(groups[2].tasks.map(task => task.id)).toEqual(['todo', 'ongoing', 'done']);
  expect(records.map(task => task.id)).toEqual(['done', 'ongoing', 'todo', 'undated', 'tomorrow']);
  expect(taskGroups(records.filter(task => task.status !== 'done'))[2].tasks.map(task => task.id)).toEqual(['todo', 'ongoing']);
});
it('groups completed general work by Singapore completion day at midnight', () => {
  const records = [task({ id: 'before', status: 'done', completedAt: Date.parse('2026-10-05T15:59:59Z'), reward: 5 }), task({ id: 'after', status: 'done', completedAt: Date.parse('2026-10-05T16:00:00Z'), reward: 5 }), task({ id: 'planned', assignedDay: '2026-10-06' })];
  const groups = taskGroups(records);
  expect(groups.map(group => group.day)).toEqual(['2026-10-06', '2026-10-05']);
  expect(groups[0].tasks.map(task => task.id)).toEqual(['planned', 'after']);
  expect(groups[1].tasks.map(task => task.id)).toEqual(['before']);
});

it('reorders status changes without changing saved record order and restores ordering on undo', () => {
  const records = [task({ id: 'ongoing', status: 'inprogress', createdAt: NOW - 10 }), task({ id: 'finished', status: 'done', completedAt: NOW - 1, reward: 5 }), task({ id: 'first', createdAt: NOW - 2 }), task({ id: 'second' })];
  expect(sortTasksByStatus(records).map(task => task.id)).toEqual(['first', 'second', 'ongoing', 'finished']);
  const changed = records.map(task => task.id === 'first' ? { ...task, status: 'done' as const, completedAt: NOW, reward: 5 } : task);
  expect(sortTasksByStatus(changed).map(task => task.id)).toEqual(['second', 'ongoing', 'first', 'finished']);
  expect(sortTasksByStatus(records).map(task => task.id)).toEqual(['first', 'second', 'ongoing', 'finished']);
  expect(records.map(task => task.id)).toEqual(['ongoing', 'finished', 'first', 'second']);
});
