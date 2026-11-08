import type { D1 } from './db';

const ITERATIONS = 100_000; // Workers' WebCrypto maximum for PBKDF2
export const COOKIE = 'n24_session';
const SESSION_DAYS = 7;
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

export type AdminUser = { id: number; name: string; email: string; role: string };

export async function getUser(db: D1, request: Request): Promise<AdminUser | null> {
  const token = tokenFrom(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db.prepare(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`).bind(await sha256Hex(token), now()).first<AdminUser>();
}

export async function destroySession(db: D1, request: Request) {
  const token = tokenFrom(request);
  if (token) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).first();
}

export const sessionCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
export const clearCookie = (secure: boolean) =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;

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
