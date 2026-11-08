// RFC 6238 time-based codes (Google Authenticator, Microsoft Authenticator, etc.): SHA-1, 6 digits, 30 seconds.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '', out = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function decode(secret: string) {
  let bits = '';
  for (const c of secret.toUpperCase().replace(/[^A-Z2-7]/g, '')) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  return new Uint8Array((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

async function codeAt(secret: string, counter: number) {
  const key = await crypto.subtle.importKey('raw', decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new DataView(new ArrayBuffer(8));
  msg.setUint32(0, Math.floor(counter / 2 ** 32)); msg.setUint32(4, counter >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg.buffer));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

// Accepts the previous, current and next 30-second window (clock drift).
export async function verifyTotp(secret: string, code: string) {
  const c = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (const d of [-1, 0, 1]) if ((await codeAt(secret, now + d)) === c) return true;
  return false;
}

export const otpauthUri = (secret: string, email: string) =>
  `otpauth://totp/${encodeURIComponent('NEWS24 SHIVNERI:' + email)}?secret=${secret}&issuer=${encodeURIComponent('NEWS24 SHIVNERI')}`;
