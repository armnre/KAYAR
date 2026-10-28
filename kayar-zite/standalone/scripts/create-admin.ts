// node scripts/create-admin.mjs <username> [--name "نام"] [--role superadmin|admin] [--keep-password]
// Creates a staff account, or resets the password of an existing one. Needs DATABASE_URL (+ ZITE_AUTH_PEPPER if set in production).
// Password: ADMIN_PASSWORD env, or typed (hidden) at the prompt. The account must change it on first login.
import '../env';
import readline from 'node:readline';
import { pool, migrate, zite } from '../db';
import { hashPassword, normalizeUsername, passwordPolicyError } from '../../apps/kayar/src/server/auth';
import { revokeAllSessions } from '../../apps/kayar/src/server/rbac';

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const username = args.find((a, i) => !a.startsWith('--') && !['--name', '--role'].includes(args[i - 1] ?? ''));
const role = flag('--role') ?? 'superadmin';

function ask(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => { if (s.includes(q)) out.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

(async () => {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set.'); process.exit(2); }
  if (!username) { console.error('Usage: node scripts/create-admin.mjs <username> [--name "..."] [--role superadmin|admin]'); process.exit(2); }
  if (!['superadmin', 'admin', 'editor', 'support'].includes(role)) { console.error('Invalid --role'); process.exit(2); }
  const u = normalizeUsername(username);
  const pw = process.env.ADMIN_PASSWORD || await ask('New password: ');
  const policy = passwordPolicyError(pw, { username: u });
  if (policy) { console.error(`Rejected: ${policy}`); process.exit(3); }
  await migrate();
  const existing = await zite.members.findOne({ filters: { username: u } });
  const record = { passwordHash: await hashPassword(pw), mustChangePassword: !args.includes('--keep-password'), passwordChangedAt: new Date().toISOString(), status: 'active' };
  if (existing) {
    await zite.members.update({ id: existing.id, record: { ...record, role: flag('--role') ? role : existing.role } });
    await revokeAllSessions(existing.id);
    console.log(`Password reset for "${u}" (role: ${flag('--role') ? role : existing.role}); all sessions revoked.`);
  } else {
    await zite.members.create({ record: { ...record, username: u, displayName: flag('--name') ?? 'مدیر', role, createdBy: 'cli' } });
    console.log(`Created ${role} "${u}".`);
  }
  await pool.end();
})().catch(async (e) => { console.error((e as Error).message); await pool.end().catch(() => {}); process.exit(1); });
