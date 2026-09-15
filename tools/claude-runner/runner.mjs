#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir, hostname } from 'node:os';
import { resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const configPath = process.env.DONA_CLAUDE_RUNNER_CONFIG || resolve(homedir(), '.config/dona-claude-runner/config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const runnerId = config.runnerId || `mac-${hostname()}`;
const pollMs = Math.max(5_000, Number(config.pollSeconds || 30) * 1_000);
const timeoutMs = Math.max(60_000, Number(config.maxRunMinutes || 45) * 60_000);
const projects = config.projects || {};

function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

function projectDirectory(key) {
  const entry = projects[key];
  if (!entry?.path) throw new Error(`PROJECT_NOT_ALLOWED:${key || 'missing'}`);
  const directory = resolve(entry.path);
  const roots = (config.allowedRoots || []).map((root) => resolve(root));
  if (!roots.some((root) => directory === root || directory.startsWith(root + sep))) {
    throw new Error(`PROJECT_OUTSIDE_ALLOWED_ROOT:${key}`);
  }
  return directory;
}

async function keychainSecret() {
  const service = config.keychainService || 'dona-claude-runner';
  const account = config.keychainAccount || runnerId;
  const { stdout } = await execFileAsync('/usr/bin/security', [
    'find-generic-password', '-s', service, '-a', account, '-w',
  ]);
  return stdout.trim();
}

async function api(operation, payload = {}) {
  const secret = await keychainSecret();
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operation, runner_id: runnerId, secret, ...payload }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`INVALID_API_RESPONSE:${response.status}`); }
  if (!response.ok || data.ok === false) throw new Error(data.error || `API_${response.status}`);
  return data;
}

function buildPrompt(job) {
  return [
    'Jesteś wykonawcą technicznym systemu Dona.',
    `Id zadania: ${job.polecenie_id}`,
    `Projekt: ${job.projekt}`,
    '',
    'Wykonaj zadanie w bieżącym repozytorium. Najpierw sprawdź stan i istniejące rozwiązania.',
    'Nie publikuj, nie wdrażaj, nie wysyłaj wiadomości i nie wykonuj zewnętrznych działań biznesowych.',
    'Nie omijaj zabezpieczeń. Zachowaj obce zmiany. Uruchom adekwatne testy.',
    'Jeżeli zmieniasz kod, pracuj na osobnej gałęzi i zakończ raportem: wynik, pliki, testy, blocker.',
    '',
    'Polecenie Piotra:',
    String(job.tresc || ''),
  ].join('\n');
}

async function runClaude(job) {
  const cwd = projectDirectory(job.projekt);
  const readOnly = job.tryb === 'read_only';
  const allowedTools = readOnly
    ? 'Read,Glob,Grep,Bash(git status *),Bash(git diff *),Bash(git log *)'
    : 'Read,Edit,Write,Glob,Grep,Bash(git status *),Bash(git diff *),Bash(git log *),Bash(git branch *),Bash(git switch *),Bash(git checkout -b *),Bash(git add *),Bash(git commit *),Bash(npm test *),Bash(npm run *),Bash(node --test *),Bash(pytest *)';
  const args = [
    '-p', buildPrompt(job),
    '--output-format', 'json',
    '--permission-mode', readOnly ? 'dontAsk' : 'acceptEdits',
    '--permission-prompts', 'none',
    '--allowedTools', allowedTools,
  ];
  return new Promise((resolveRun) => {
    const child = spawn(config.claudePath || 'claude', args, { cwd, shell: false, env: process.env });
    let stdout = '';
    let stderr = '';
    const cap = Number(config.maxOutputBytes || 2_000_000);
    child.stdout.on('data', (chunk) => { if (stdout.length < cap) stdout += chunk; });
    child.stderr.on('data', (chunk) => { if (stderr.length < cap) stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch {}
      resolveRun({
        ok: code === 0,
        exit_code: code,
        signal,
        result: parsed?.result || stdout.slice(-50_000),
        session_id: parsed?.session_id || '',
        cost_usd: parsed?.total_cost_usd ?? null,
        stderr: stderr.slice(-10_000),
      });
    });
  });
}

async function processOne() {
  const claimed = await api('claim', { lease_minutes: Math.ceil(timeoutMs / 60_000) + 10 });
  if (!claimed.job) return false;
  const job = claimed.job;
  const heartbeat = setInterval(() => {
    api('heartbeat', { polecenie_id: job.polecenie_id, lease_id: job.lease_id }).catch(() => {});
  }, 60_000);
  try {
    const outcome = await runClaude(job);
    await api(outcome.ok ? 'complete' : 'fail', {
      polecenie_id: job.polecenie_id,
      lease_id: job.lease_id,
      odpowiedz: String(outcome.result || '').slice(0, 100_000),
      result_ref: outcome.session_id,
      error_code: outcome.ok ? '' : `CLAUDE_EXIT_${outcome.exit_code ?? outcome.signal ?? 'UNKNOWN'}`,
      metadata: { cost_usd: outcome.cost_usd, stderr: outcome.stderr },
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

await api('status', { version: '0.1.0' });
for (;;) {
  try {
    const worked = await processOne();
    if (!worked) await sleep(pollMs);
  } catch (error) {
    process.stderr.write(`[dona-runner] ${new Date().toISOString()} ${error.message}\n`);
    await sleep(pollMs);
  }
}
