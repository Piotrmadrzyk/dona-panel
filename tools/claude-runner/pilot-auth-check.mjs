// Read authentication status only; no model prompts, login, or queue operations.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { childEnvironment } from './model-router.mjs';
const exec = promisify(execFile);
const report = { productionChanged: false, modelTaskStarted: false, checks: [] };
let scratch;
try {
  const dirs = [...new Set((process.env.PATH || '').split(':').filter(isAbsolute))];
  let executable;
  for (const dir of dirs) {
    try { await access(join(dir, 'claude'), constants.X_OK); executable = join(dir, 'claude'); break; }
    catch { /* Try next PATH entry. */ }
  }
  if (!executable) throw new Error('CLI_MISSING');
  scratch = await mkdtemp(join(tmpdir(), 'dona-auth-check-'));
  const minimal = childEnvironment({ home: homedir(), path: dirs.join(':') });
  const identity = { USER: userInfo().username, LOGNAME: userInfo().username };
  const temporary = { TMPDIR: tmpdir() };
  const variants = [
    ['terminal_environment', process.env],
    ['pilot_environment', minimal],
    ['pilot_with_user_identity', { ...minimal, ...identity }],
    ['pilot_with_tmpdir', { ...minimal, ...temporary }],
    ['pilot_with_identity_and_tmpdir', { ...minimal, ...identity, ...temporary }],
  ];
  report.customConfigDirectoryPresent = Boolean(process.env.CLAUDE_CONFIG_DIR);
  if (process.env.CLAUDE_CONFIG_DIR && isAbsolute(process.env.CLAUDE_CONFIG_DIR)) {
    variants.push(['pilot_with_config_location', { ...minimal,
      ...identity, ...temporary, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR }]);
  }
  for (const [name, env] of variants) {
    process.stderr.write(`Sprawdzam status logowania: ${name}\n`);
    let stdout = '', exitCode = 0;
    try { ({ stdout } = await exec(executable, ['auth', 'status'], {
      cwd: scratch, env, timeout: 15000, maxBuffer: 65536 })); }
    catch (error) { stdout = error.stdout || ''; exitCode = Number.isInteger(error.code) ? error.code : null; }
    try {
      const status = JSON.parse(stdout);
      report.checks.push({ name, exitCode, loggedIn: status.loggedIn === true,
        subscriptionLogin: status.authMethod === 'claude.ai',
        firstParty: status.apiProvider === 'firstParty' });
    } catch { report.checks.push({ name, exitCode, statusReadable: false }); }
  }
} catch { report.error = 'AUTH_DIAGNOSTIC_SETUP_FAILED'; }
finally { if (scratch) await rm(scratch, { recursive: true, force: true }); }
// No names, emails, tokens, raw output or configuration contents leave this script.
console.log(JSON.stringify(report, null, 2));
