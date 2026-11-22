/**
 * Creates (or promotes) a superadmin.
 *
 *   npm run create-admin -- --email you@site.com --first Ada --last Obi
 *
 * The password is prompted for (or read from ADMIN_PASSWORD) so it never lands
 * in shell history.
 */
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/index.js';
import { ROLES } from '../src/utils/permissions.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    first: { type: 'string' },
    last: { type: 'string' },
  },
});

async function ask(rl, question, fallback) {
  if (fallback) return fallback;
  const answer = (await rl.question(question)).trim();
  if (!answer) throw new Error(`${question.replace(':', '').trim()} is required`);
  return answer;
}

async function run() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = (await ask(rl, 'Email: ', values.email)).toLowerCase();
  const firstName = await ask(rl, 'First name: ', values.first);
  const lastName = await ask(rl, 'Last name: ', values.last);
  const password = await ask(rl, 'Password (min 10 chars): ', process.env.ADMIN_PASSWORD);
  rl.close();

  if (password.length < 10) throw new Error('Password must be at least 10 characters');

  await connectDB();
  let user = await User.findOne({ email });
  if (user) {
    user.role = ROLES.SUPERADMIN;
    user.password = password;
    user.status = 'active';
    console.log(`Promoting existing user ${email} to superadmin`);
  } else {
    user = new User({ email, firstName, lastName, password, role: ROLES.SUPERADMIN, emailVerified: true });
    console.log(`Creating superadmin ${email}`);
  }
  await user.save();
  console.log('Done.');
  await disconnectDB();
}

run().catch(async (err) => {
  console.error(`Error: ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
