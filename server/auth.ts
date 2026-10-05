import { createRemoteJWKSet, jwtVerify } from 'jose';
import { cookie, HttpError, setCookie } from './http';
import type { D1Database } from '@cloudflare/workers-types';

export type Env = { DB: D1Database; GOOGLE_CLIENT_ID?: string };
export type User = { id: string; email: string; name: string };
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const SESSION_COOKIE = 'pixel_session';
const CHALLENGE_COOKIE = 'pixel_login';

export async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function randomToken(): string { return [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join(''); }

export async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = cookie(request, SESSION_COOKIE);
  if (!token) return null;
  return env.DB.prepare('SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?')
    .bind(await hash(token), Date.now()).first<User>();
}
export async function requireUser(request: Request, env: Env): Promise<User> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'Sign in to sync your planner.');
  return user;
}
export async function loginChallenge(request: Request, env: Env): Promise<{ nonce: string; header: string }> {
  const nonce = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_challenges WHERE expires_at < ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO login_challenges (nonce_hash, expires_at) VALUES (?, ?)').bind(await hash(nonce), Date.now() + 600_000),
  ]);
  return { nonce, header: setCookie(request, CHALLENGE_COOKIE, nonce, 600) };
}
export async function signIn(request: Request, env: Env, credential: string): Promise<{ user: User; cookies: string[] }> {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'Google sign-in is awaiting configuration.');
  const nonce = cookie(request, CHALLENGE_COOKIE);
  if (!nonce) throw new HttpError(401, 'Refresh and try signing in again.');
  let payload;
  try { payload = (await jwtVerify(credential, keys, { audience: env.GOOGLE_CLIENT_ID, issuer: ['https://accounts.google.com', 'accounts.google.com'], algorithms: ['RS256'] })).payload; }
  catch { throw new HttpError(401, 'Google sign-in could not be verified.'); }
  if (!payload.sub || payload.nonce !== nonce || payload.email_verified !== true || typeof payload.email !== 'string') throw new HttpError(401, 'Google identity or login challenge is invalid.');
  const challenge = await env.DB.prepare('DELETE FROM login_challenges WHERE nonce_hash = ? AND expires_at > ? RETURNING nonce_hash').bind(await hash(nonce), Date.now()).first();
  if (!challenge) throw new HttpError(401, 'This sign-in challenge has expired or was already used.');
  const user: User = { id: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : payload.email };
  const token = randomToken();
  const lifespan = 30 * 86_400;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id,email,name) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name').bind(user.id, user.email, user.name),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(token), user.id, Date.now() + lifespan * 1000),
  ]);
  return { user, cookies: [setCookie(request, SESSION_COOKIE, token, lifespan), setCookie(request, CHALLENGE_COOKIE, '', 0)] };
}
export async function signOut(request: Request, env: Env): Promise<string> {
  const token = cookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hash(token)).run();
  return setCookie(request, SESSION_COOKIE, '', 0);
}
