// Protocol parsing, not proof of task completion. Trusted verification follows.
// Sources: code.claude.com/docs/en/headless; learn.chatgpt.com/docs/non-interactive-mode
const failureCodes = new Set(['usage_limit_reached', 'rate_limit_exceeded', 'rate_limit_error',
  'authentication_error', 'unauthorized', 'not_logged_in', 'overloaded_error',
  'service_unavailable', 'permission_denied', 'forbidden']);
const bad = code => ({ ok: false, code });
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const errorCode = value => failureCodes.has(value?.code) ? value.code
  : failureCodes.has(value?.type) ? value.type : 'PROVIDER_FAILED';

export function parseResult(engine, processResult) {
  if (!['claude', 'codex'].includes(engine)) return bad('ENGINE_NOT_ALLOWED');
  if (processResult?.timedOut) return { ...bad('TIMEOUT'), timedOut: true };
  if (processResult?.leaseLost) return { ...bad('LEASE_LOST'), leaseLost: true };
  if (['CANCELLED', 'OUTPUT_LIMIT', 'STDIN_FAILED'].includes(processResult?.code)) return bad(processResult.code);
  const text = processResult?.stdout;
  if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 1024 * 1024) return bad('INVALID_OUTPUT');
  // stderr and model prose are never treated as authoritative routing commands.
  try {
    if (engine === 'claude') {
      const result = JSON.parse(text);
      if (!object(result) || result.type !== 'result') return bad('INVALID_OUTPUT');
      if (result.is_error === true) return bad(errorCode(result.error));
      if (result.is_error !== false || result.subtype !== 'success'
        || typeof result.result !== 'string' || !result.result.trim()) return bad('INCOMPLETE_OUTPUT');
      if (processResult.ok !== true || processResult.exitCode !== 0) return bad('PROCESS_FAILED');
      // Cost metadata deliberately not returned as a charge to the subscription.
      return { ok: true, answer: result.result };
    }
    const events = text.trim().split(/\r?\n/).map(line => JSON.parse(line));
    if (events.some(e => !object(e) || typeof e.type !== 'string')) return bad('INVALID_OUTPUT');
    let started = false, completed = false, answer = '';
    for (const event of events) {
      if (event.type === 'error' || event.type === 'turn.failed') return bad(errorCode(event.error || event));
      if (completed) return bad('INVALID_EVENT_ORDER');
      if (event.type === 'turn.started') {
        if (started) return bad('INVALID_EVENT_ORDER');
        started = true;
      }
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        if (!started || typeof event.item.text !== 'string') return bad('INVALID_EVENT_ORDER');
        answer = event.item.text;
      }
      if (event.type === 'turn.completed') {
        if (!started) return bad('INVALID_EVENT_ORDER');
        completed = true;
      }
    }
    if (!completed || !answer.trim()) return bad('INCOMPLETE_OUTPUT');
    if (processResult.ok !== true || processResult.exitCode !== 0) return bad('PROCESS_FAILED');
    return { ok: true, answer };
  } catch { return bad('INVALID_OUTPUT'); }
}
