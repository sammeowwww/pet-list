import type { D1Database } from '@cloudflare/workers-types';
import { applyCommand, type CloudSnapshot, type Command, type Receipt } from '../src/domain/commands';
import { appStateSchema, emptyState, settleRewards } from '../src/domain/state';
import { HttpError } from './http';

type Row = { state: string; revision: number };
export async function snapshot(db: D1Database, userId: string): Promise<CloudSnapshot> {
  await db.prepare('INSERT OR IGNORE INTO planners (user_id,state) VALUES (?,?)').bind(userId, JSON.stringify(emptyState())).run();
  const row = await db.prepare('SELECT state,revision FROM planners WHERE user_id=?').bind(userId).first<Row>();
  if (!row) throw new HttpError(503, 'Planner unavailable.');
  return { state: appStateSchema.parse(JSON.parse(row.state)), revision: row.revision };
}

async function committedReceipt(db: D1Database, userId: string, id: string): Promise<Receipt | null> {
  return db.prepare('SELECT command_id AS id,error FROM receipts WHERE user_id=? AND command_id=?').bind(userId, id).first<Receipt>();
}

export async function commitCommand(db: D1Database, userId: string, command: Command, now: number): Promise<Receipt> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const previous = await committedReceipt(db, userId, command.id);
    if (previous) return previous;
    const current = await snapshot(db, userId);
    let state = settleRewards(current.state, now);
    let error: string | null = null;
    try {
      if (command.at > now + 60_000) throw new Error('Your device clock is ahead. Check the time and retry.');
      state = appStateSchema.parse(applyCommand(state, command, now, current.revision));
    } catch (reason) { error = reason instanceof Error ? reason.message : 'This change could not be applied.'; }
    // The conditional update and receipt commit together. A losing concurrent writer retries against fresh state.
    const results = await db.batch([
      db.prepare('UPDATE planners SET state=?,revision=revision+1,last_operation=? WHERE user_id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM receipts WHERE user_id=? AND command_id=?)')
        .bind(JSON.stringify(state), command.id, userId, current.revision, userId, command.id),
      db.prepare('INSERT OR IGNORE INTO receipts (user_id,command_id,error) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM planners WHERE user_id=? AND last_operation=?)')
        .bind(userId, command.id, error, userId, command.id),
    ]);
    if (results[0].meta.changes > 0) return { id: command.id, error };
  }
  throw new HttpError(409, 'Another device is syncing. Your queued changes will retry.');
}

export async function settledSnapshot(db: D1Database, userId: string, now: number): Promise<CloudSnapshot> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await snapshot(db, userId);
    const next = settleRewards(current.state, now);
    if (next === current.state) return current;
    const result = await db.prepare('UPDATE planners SET state=?,revision=revision+1 WHERE user_id=? AND revision=?')
      .bind(JSON.stringify(next), userId, current.revision).run();
    if (result.meta.changes) return { state: next, revision: current.revision + 1 };
  }
  throw new HttpError(409, 'Planner is busy. Retry shortly.');
}
