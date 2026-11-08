// Usage: node scripts/make-admin.mjs "you@example.com" "Your Name"
// Prompts for a password (min 12 chars) and writes seed/admin.sql (git-ignored).
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync } from 'node:fs';

const [email, name] = process.argv.slice(2);
if (!email || !name) { console.error('Usage: node scripts/make-admin.mjs "email" "Name"'); process.exit(1); }

function ask(q) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const w = rl._writeToOutput; let started = false;
    rl._writeToOutput = (s) => { if (!started) { started = true; w.call(rl, s); } }; // hide typing
    rl.question(q, (a) => { rl.close(); console.log(); res(a); });
  });
}
const password = process.env.ADMIN_PASSWORD ?? await ask('Password (min 12 chars): ');
if (password.length < 12) { console.error('Password too short.'); process.exit(1); }

const ITER = 100000, salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITER, 32, 'sha256').toString('hex');
const q = (s) => s.replace(/'/g, "''");
mkdirSync('seed', { recursive: true });
writeFileSync('seed/admin.sql',
  `INSERT INTO users (email, name, role, password_hash) VALUES ('${q(email.toLowerCase())}', '${q(name)}', 'admin', 'pbkdf2$${ITER}$${salt.toString('hex')}$${hash}');\n`);
console.log('Wrote seed/admin.sql');
