import type { D1 } from './db';

const ITERATIONS = 100_000; // Workers' WebCrypto maximum for PBKDF2
export const COOKIE = 'n24_session';
// Long-lived so the installed phone app stays signed in; Lax so the cookie is sent when the app is opened from the home screen.
const SESSION_DAYS = 90;
const enc = new TextEncoder();
const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}
export const sha256Hex = async (s: string) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
export async function verifyPassword(password: string, stored: string) {
  const [alg, it, saltHex, hashHex] = stored.split('$');
  if (alg !== 'pbkdf2' || !it || !saltHex || !hashHex) return false;
  const got = toHex(await pbkdf2(password, fromHex(saltHex), Number(it)));
  let diff = got.length ^ hashHex.length; // constant-time compare
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ (hashHex.charCodeAt(i) || 0);
  return diff === 0;
}

// Same format as scripts/make-admin.mjs.
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(await pbkdf2(password, salt, ITERATIONS))}`;
}

// Log out every other device of this user (after a password change).
export async function destroyOtherSessions(db: D1, request: Request, userId: number) {
  const token = tokenFrom(request);
  await db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').bind(userId, token ? await sha256Hex(token) : '').first();
}

const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

export async function createSession(db: D1, userId: number) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().replace(/\.\d+Z$/, 'Z');
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, expires).first();
  return token;
}

const tokenFrom = (request: Request) =>
  request.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) ?? null;

export type AdminUser = { id: number; name: string; email: string; role: string; expires_at?: string };

export async function getUser(db: D1, request: Request): Promise<AdminUser | null> {
  const token = tokenFrom(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db.prepare(
    `SELECT u.id, u.name, u.email, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`).bind(await sha256Hex(token), now()).first<AdminUser>();
}

// Sliding login: when less than 80 days are left, push the expiry back to 90 days and hand out a fresh cookie.
export async function renewSession(db: D1, request: Request, user: AdminUser, secure: boolean) {
  const token = tokenFrom(request);
  if (!token || !user.expires_at || Date.parse(user.expires_at) - Date.now() > 80 * 86400_000) return null;
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().replace(/\.\d+Z$/, 'Z');
  await db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').bind(expires, await sha256Hex(token)).first();
  return sessionCookie(token, secure);
}

export async function destroySession(db: D1, request: Request) {
  const token = tokenFrom(request);
  if (token) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).first();
}

export const sessionCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
export const clearCookie = (secure: boolean) =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

// 5 failures per IP per 15 minutes
export async function tooManyAttempts(db: D1, ip: string) {
  const since = new Date(Date.now() - 15 * 60_000).toISOString().replace(/\.\d+Z$/, 'Z');
  const r = await db.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at > ?')
    .bind(ip, since).first<{ n: number }>();
  return (r?.n ?? 0) >= 5;
}
export async function recordFailure(db: D1, ip: string) {
  await db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip).first();
  await db.prepare(`DELETE FROM login_attempts WHERE attempted_at < strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 day')`).first();
}
