// Loads the demo Pune news, images, ad and e-paper into the LOCAL dev database and bucket only.
// Usage: npm run db:demo-local
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const run = (args) => execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
const types = { jpg: 'image/jpeg', pdf: 'application/pdf' };

for (const f of readdirSync('seed/demo-media')) {
  const key = f.endsWith('.pdf') ? 'epaper/2026/11/2026-11-08-demo.pdf'
    : f === 'democover.jpg' ? 'epaper/2026/11/2026-11-08-democover.jpg' : `img/2026/11/${f}`;
  run(['r2', 'object', 'put', `news24-media/${key}`, '--file', `seed/demo-media/${f}`,
    '--content-type', types[f.split('.').pop()], '--local']);
}
run(['d1', 'execute', 'news24-db', '--local', '--file=seed/demo-pune.sql']);
console.log('Demo data loaded (local only).');
