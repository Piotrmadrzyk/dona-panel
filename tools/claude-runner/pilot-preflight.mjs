#!/usr/bin/env node
// No queue calls, no agent tasks, no reading auth.json or Keychain.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform, release } from 'node:os';
const exec = promisify(execFile);
const report = { node: process.versions.node, platform: platform(), os: release(),
  nodeSupported: Number(process.versions.node.split('.')[0]) >= 20,
  productionChanged: false, agentTaskStarted: false,
  authVerified: false, isolationVerified: false, readyToRunPilot: false, tools: {} };
// Presence only, never values. Existing API variables would change billing.
report.billingOverridesPresent = ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','OPENAI_API_KEY','CODEX_API_KEY',
  'ANTHROPIC_PROFILE','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_OAUTH_TOKEN'].filter(key => Boolean(process.env[key]));
for (const command of ['git', 'claude', 'codex']) {
  try {
    const { stdout } = await exec(command, ['--version'], { timeout: 10000, maxBuffer: 10000 });
    report.tools[command] = { available: true, version: stdout.match(/\d+\.\d+(?:\.\d+)?/)?.[0] || 'unknown' };
  } catch { report.tools[command] = { available: false }; }
}
report.next = 'Verify personal subscription login and isolated execution host before running any task. This diagnostic does not authorize or install a runner.';
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
