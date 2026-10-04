// Print a one-time password reset link for a user. This is the fallback when
// the group owner is the one locked out.
//
//   npm run reset-link -- <username> [base-url]
//
// Stop the server first: it keeps the data in memory and would overwrite
// this change on its next save.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../lib/store.js';
import { createReset, RESET_HOURS } from '../lib/auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(here, '..', '.env'));
} catch {}

const [username, baseUrl = `http://localhost:${process.env.PORT || 4100}`] = process.argv.slice(2);
const store = new Store(process.env.DATA_FILE || path.join(here, '..', 'data', 'top10.json'));

if (!username) {
  console.error('Usage: npm run reset-link -- <username> [base-url]');
  console.error('Users:', store.data.users.map((u) => u.username).join(', ') || '(none)');
  process.exit(1);
}
const user = store.data.users.find((u) => u.username === username.toLowerCase());
if (!user) {
  console.error(`No user "${username}". Users: ${store.data.users.map((u) => u.username).join(', ')}`);
  process.exit(1);
}
const token = createReset(store.data, user.id);
store.flush();
console.log(`Reset link for ${user.displayName} (valid ${RESET_HOURS}h, one use):`);
console.log(`${baseUrl.replace(/\/$/, '')}/#/reset/${token}`);
