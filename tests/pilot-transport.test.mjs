import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQueueTransport } from '../tools/claude-runner/queue/transport.mjs';

test('HTTPS transport validates TLS, blocks redirects, bounds responses and aborts stalled calls', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dona-tls-test-'));
  let server;
  try {
    execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes',
      '-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1',
      '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'], { stdio: 'ignore' });
    const cert = readFileSync(join(dir,'cert.pem'));
    let mode = 'ok', requests = 0, headers;
    server = https.createServer({ key: readFileSync(join(dir,'key.pem')), cert }, (req,res) => {
      requests++; headers = req.headers;
      req.resume();
      if (mode === 'stall') return;
      if (mode === 'redirect') { res.writeHead(302, { location: 'https://example.com/' }); res.end(); return; }
      if (mode === 'auth') { res.writeHead(401); res.end('private-provider-message'); return; }
      res.setHeader('content-type','application/json');
      res.end(mode === 'large' ? JSON.stringify({ ok:true, data:'a'.repeat(3000) })
        : mode === 'invalid' ? '{"ok":"true"}' : '{"ok":true}');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const options = { endpoint:`https://localhost:${port}/webhook/dona-router-pilot`, hostname:'localhost', port,
      token:'a'.repeat(64), ca:cert, timeoutMs:1000, maxBytes:1024 };
    const call = createQueueTransport(options);
    await t.test('authenticated JSON succeeds', async () => {
      assert.deepEqual(await call({operation:'status'}), {ok:true});
      assert.equal(headers.authorization, `Bearer ${options.token}`);
    });
    await t.test('untrusted certificate is rejected', async () => {
      await assert.rejects(createQueueTransport({...options,ca:undefined})({operation:'status'}), /QUEUE_NETWORK_FAILED/);
    });
    await t.test('redirect is rejected without following it', async () => {
      mode='redirect'; const before=requests;
      await assert.rejects(call({operation:'status'}), /QUEUE_HTTP_FAILED/); assert.equal(requests,before+1);
    });
    await t.test('authentication failure excludes raw provider text', async () => {
      mode='auth'; await assert.rejects(call({operation:'status'}), {message:'QUEUE_AUTH_FAILED'});
    });
    await t.test('oversized and malformed responses fail closed', async () => {
      mode='large'; await assert.rejects(call({operation:'status'}), /QUEUE_RESPONSE_TOO_LARGE/);
      mode='invalid'; await assert.rejects(call({operation:'status'}), /QUEUE_INVALID_RESPONSE/);
    });
    await t.test('wall-clock timeout includes a stalled server', async () => {
      mode='stall'; await assert.rejects(createQueueTransport({...options,timeoutMs:100})({operation:'status'}), /QUEUE_TIMEOUT/);
    });
    await t.test('external cancellation terminates request', async () => {
      const controller = new AbortController();
      const pending=call({operation:'status'}, {signal:controller.signal});
      controller.abort(); await assert.rejects(pending, /QUEUE_CANCELLED/);
    });
    await t.test('admin operations and pre-aborted requests never reach server', async () => {
      const before=requests, controller=new AbortController(); controller.abort();
      await assert.rejects(call({operation:'enqueue'}), /OPERATION_NOT_ALLOWED/);
      await assert.rejects(call({operation:'status'}, {signal:controller.signal}), /QUEUE_CANCELLED/);
      assert.equal(requests,before);
      assert.throws(()=>createQueueTransport({...options,endpoint:'http://localhost/webhook/dona-router-pilot'}));
    });
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
    rmSync(dir, {recursive:true,force:true});
  }
});
