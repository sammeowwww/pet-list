import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { commitCommand, settledSnapshot, snapshot } from '../../server/planner';
import { currentUser, hash } from '../../server/auth';
import { onRequest } from '../../functions/api/[[path]]';
import type { Command, PlannerAction } from './commands';

const databases: DatabaseSync[] = [];
function fixture() {
  const sql = new DatabaseSync(':memory:'); databases.push(sql);
  sql.exec(readFileSync('migrations/0001_accounts.sql', 'utf8'));
  sql.prepare('INSERT INTO users VALUES (?,?,?)').run('alice', 'alice@example.com', 'Alice');
  sql.prepare('INSERT INTO users VALUES (?,?,?)').run('bob', 'bob@example.com', 'Bob');
  function prepared(query: string, values: (string | number | null)[] = []) {
    return {
      bind: (...parameters: (string | number | null)[]) => prepared(query, parameters),
      first: async () => sql.prepare(query).get(...values) ?? null,
      run: () => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } }),
    };
  }
  const db = { prepare: prepared, batch: async (statements: ReturnType<typeof prepared>[]) => {
    sql.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(statement.run()); sql.exec('COMMIT'); return results; }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  } } as unknown as D1Database;
  return { db, sql };
}
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
const now = Date.now();
const command = (action: PlannerAction): Command => ({ id: crypto.randomUUID(), at: now, order: now, action });
it('commits SQL receipts atomically, handles competing revisions, and isolates accounts', async () => {
  const { db } = fixture();
  const create = command({ kind: 'create', taskId: 'one', input: { title: 'Shared task', note: '', category: 'Personal', assignedDay: null, deadline: null } });
  await commitCommand(db, 'alice', create, now);
  const completion = command({ kind: 'complete', taskId: 'one' });
  await Promise.all([commitCommand(db, 'alice', completion, now), commitCommand(db, 'alice', completion, now)]);
  const final = await settledSnapshot(db, 'alice', now + 10_000);
  expect(final.state.tasks).toHaveLength(1); expect(final.state.coins).toBe(5);
  expect((await settledSnapshot(db, 'alice', now + 20_000)).state.coins).toBe(5);
  expect((await snapshot(db, 'bob')).state.tasks).toHaveLength(0);
  await Promise.all([commitCommand(db, 'alice', command({ kind: 'feed', pet: 'dog' }), now), commitCommand(db, 'alice', command({ kind: 'feed', pet: 'dog' }), now)]);
  expect((await snapshot(db, 'alice')).state.coins).toBe(8);
});
it('requires a live hashed session and rejects unauthenticated and cross-origin writes', async () => {
  const { db, sql } = fixture();
  const token = 'test-session-only';
  sql.prepare('INSERT INTO sessions VALUES (?,?,?)').run(await hash(token), 'alice', Date.now() + 60_000);
  expect((await currentUser(new Request('https://petlist.test/api/session', { headers: { Cookie: `pixel_session=${token}` } }), { DB: db }))?.id).toBe('alice');
  const denied = await onRequest({ request: new Request('https://petlist.test/api/planner'), env: { DB: db } });
  expect(denied.status).toBe(401);
  const csrf = await onRequest({ request: new Request('https://petlist.test/api/sync', { method: 'POST', headers: { Origin: 'https://attacker.test' } }), env: { DB: db } });
  expect(csrf.status).toBe(403);
  const login = await onRequest({ request: new Request('https://petlist.test/api/login', { method: 'POST', headers: { Origin: 'https://petlist.test', 'Content-Type': 'application/json' }, body: '{"credential":"fake"}' }), env: { DB: db, GOOGLE_CLIENT_ID: 'client' } });
  expect(login.status).toBe(401);
  sql.prepare('UPDATE sessions SET expires_at=0').run();
  expect(await currentUser(new Request('https://petlist.test', { headers: { Cookie: `pixel_session=${token}` } }), { DB: db })).toBeNull();
});
it('deduplicates recurring rewards and successors under SQL contention, and protects edited successors from offline undo', async () => {
  const { db } = fixture();
  const at = Date.parse('2026-10-06T10:00:00+08:00');
  const cmd = (action: PlannerAction, time = at): Command => ({ id: crypto.randomUUID(), at: time, order: time, action });
  await commitCommand(db, 'alice', cmd({ kind: 'create', taskId: 'daily', input: { title: 'Daily care', note: '', category: 'Personal', assignedDay: '2026-10-06', deadline: null, repeat: { mode: 'daily', days: [] } } }), at);
  const done = cmd({ kind: 'complete', taskId: 'daily:2026-10-06' });
  await Promise.all([commitCommand(db, 'alice', done, at), commitCommand(db, 'alice', done, at)]);
  const [a, b] = await Promise.all([settledSnapshot(db, 'alice', at + 20000), settledSnapshot(db, 'alice', at + 20000)]);
  expect(a.state.tasks).toHaveLength(2); expect(b.state.coins).toBe(5);
  const undo = cmd({ kind: 'undo', taskId: 'daily:2026-10-06', completionId: done.id }, at + 1000);
  const next = a.state.tasks[1];
  const before = { title: next.title, note: next.note, category: next.category, assignedDay: next.assignedDay, deadline: next.deadline, repeat: next.repeat };
  await commitCommand(db, 'alice', cmd({ kind: 'edit', taskId: next.id, before, input: { ...before, note: 'Work from laptop' } }, at + 21000), at + 21000);
  const rejected = await commitCommand(db, 'alice', undo, at + 22000);
  expect(rejected.error).toContain('another device');
  const final = await snapshot(db, 'alice');
  expect(final.state.coins).toBe(5); expect(final.state.tasks[1].note).toBe('Work from laptop');
  expect(final.state.tasks[0].status).toBe('done');
  expect(await commitCommand(db, 'alice', undo, at + 23000)).toEqual(rejected);
  await commitCommand(db, 'alice', cmd({ kind: 'preference', category: 'Health', previous: 'Personal' }), at + 24000);
  expect((await snapshot(db, 'alice')).state.preferences.defaultCategory).toBe('Health');
  expect((await snapshot(db, 'bob')).state.preferences.defaultCategory).toBe('Personal');
});
