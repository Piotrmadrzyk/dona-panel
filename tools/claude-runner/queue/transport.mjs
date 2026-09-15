import https from 'node:https';

// Only an operator-configured pilot endpoint. No URL/credentials from task input.
export function createQueueTransport({ endpoint, token, timeoutMs = 2500, maxBytes = 128 * 1024,
  ca, hostname = 'pmresearch.app.n8n.cloud', port = 443 }) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== hostname || url.username || url.password
    || url.search || url.hash || url.pathname !== '/webhook/dona-router-pilot'
    || !Number.isSafeInteger(port) || port < 1 || port > 65535
    || Number(url.port || 443) !== port || !/^[a-f0-9]{64}$/.test(token || '')
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1024 * 1024)
    throw new Error('INVALID_QUEUE_TRANSPORT');
  const operations = new Set(['acquire','renew','owns','save','release','read','status']);
  return function request(body, { signal } = {}) {
    if (!body || !operations.has(body.operation)) return Promise.reject(new Error('OPERATION_NOT_ALLOWED'));
    const data = JSON.stringify(body);
    if (Buffer.byteLength(data) > maxBytes) return Promise.reject(new Error('REQUEST_TOO_LARGE'));
    if (signal?.aborted) return Promise.reject(new Error('QUEUE_CANCELLED'));
    return new Promise((resolve, reject) => {
      let timer, bytes = 0, settled = false;
      const chunks = [];
      const finish = (code, value) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (code) { req.destroy(); reject(new Error(code)); } else resolve(value);
      };
      const abort = () => finish('QUEUE_CANCELLED');
      const req = https.request(url, { method: 'POST', ca,
        rejectUnauthorized: true, agent: false,
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data),
          authorization: `Bearer ${token}` } }, response => {
        // Never follow redirects: a redirect must not receive the worker key.
        if (response.statusCode === 401 || response.statusCode === 403) return finish('QUEUE_AUTH_FAILED');
        if (response.statusCode !== 200) return finish('QUEUE_HTTP_FAILED');
        if (!/^application\/json(?:;|$)/i.test(response.headers['content-type'] || ''))
          return finish('QUEUE_INVALID_RESPONSE');
        response.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > maxBytes) return finish('QUEUE_RESPONSE_TOO_LARGE');
          chunks.push(chunk);
        });
        response.on('error', () => finish('QUEUE_NETWORK_FAILED'));
        response.on('end', () => {
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!value || Array.isArray(value) || typeof value !== 'object' || typeof value.ok !== 'boolean')
              return finish('QUEUE_INVALID_RESPONSE');
            finish(null, value);
          } catch { finish('QUEUE_INVALID_RESPONSE'); }
        });
      });
      req.on('error', () => finish('QUEUE_NETWORK_FAILED'));
      // Wall-clock timeout includes DNS, TCP, TLS and a stalled response body.
      timer = setTimeout(() => finish('QUEUE_TIMEOUT'), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) return abort();
      req.end(data);
    });
  };
}
