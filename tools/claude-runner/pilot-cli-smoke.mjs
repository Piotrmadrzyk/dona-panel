// Manual protocol check only: no queue, background service or production task.
// Uses the user's existing CLI login. Never reads or prints credential files.
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { runProcess } from './pilot-process.mjs';
import { parseResult } from './pilot-result.mjs';
import { childEnvironment } from './model-router.mjs';

const report = { productionChanged: false, queueConnected: false,
  isolationVerified: false, checks: [] };
let scratch;
try {
  if (process.platform === 'win32') throw new Error('POSIX_REQUIRED');
  const dirs = [...new Set((process.env.PATH || '').split(':').filter(isAbsolute))];
  const env = childEnvironment({ home: homedir(), path: dirs.join(':') });
  const bins = {};
  for (const engine of ['claude', 'codex']) {
    for (const dir of dirs) {
      const candidate = join(dir, engine);
      try { await access(candidate, constants.X_OK); bins[engine] = candidate; break; }
      catch { /* Continue searching trusted local PATH. */ }
    }
    if (!bins[engine]) throw new Error('CLI_MISSING');
  }
  scratch = await mkdtemp(join(tmpdir(), 'dona-protocol-'));
  const specs = [
    { engine: 'claude', sentinel: 'DONA_CLAUDE_OK', args: [
      '--safe-mode', '--restricted', '-p', '--tools', '',
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--output-format', 'json'] },
    { engine: 'codex', sentinel: 'DONA_CODEX_OK', args: [
      'exec', '--json', '--ignore-user-config', '--skip-git-repo-check',
      '--sandbox', 'read-only', '-c', 'forced_login_method="chatgpt"',
      '-c', 'approval_policy="never"', '-'] },
  ];
  for (const spec of specs) {
    process.stderr.write(`Sprawdzam ${spec.engine} (maksymalnie 90 sekund)…\n`);
    const raw = await runProcess({ executable: bins[spec.engine], args: spec.args,
      cwd: scratch, env, timeoutMs: 90000,
      stdin: `Nie korzystaj z narzędzi. Odpowiedz wyłącznie: ${spec.sentinel}\n` });
    const parsed = parseResult(spec.engine, raw);
    const passed = parsed.ok === true && parsed.answer.trim() === spec.sentinel;
    report.checks.push({ engine: spec.engine, passed,
      code: passed ? 'PROTOCOL_OK' : (parsed.code || 'UNEXPECTED_ANSWER'),
      exitCode: raw.exitCode ?? null });
  }
} catch {
  // Deliberately omit raw provider output and exception text from shared logs.
  report.error = 'SMOKE_SETUP_OR_PROCESS_FAILED';
} finally {
  if (scratch) {
    try { await rm(scratch, { recursive: true, force: true }); }
    catch { report.cleanupFailed = true; }
  }
}
report.passed = !report.error && !report.cleanupFailed
  && report.checks.length === 2 && report.checks.every(check => check.passed);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
