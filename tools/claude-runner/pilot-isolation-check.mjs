// Synthetic canaries only. Does not open user secrets or start Claude/Codex.
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { runProcess } from './pilot-process.mjs';
import { childEnvironment } from './model-router.mjs';
const report={agentStarted:false,userSecretsRead:false,isolationVerified:false};
let root, server;
try {
  if(process.platform!=='darwin') throw new Error('MACOS_REQUIRED');
  const cli=fileURLToPath(new URL('./isolation/node_modules/@anthropic-ai/sandbox-runtime/dist/cli.js',import.meta.url));
  const pkg=JSON.parse(await readFile(new URL('./isolation/node_modules/@anthropic-ai/sandbox-runtime/package.json',import.meta.url),'utf8'));
  if(pkg.version!=='0.0.76') throw new Error('RUNTIME_VERSION_MISMATCH');
  root=await realpath(await mkdtemp(join(tmpdir(),'dona-isolation-')));
  const workspace=join(root,'workspace'), blocked=join(root,'blocked');
  await mkdir(workspace,{mode:0o700}); await mkdir(blocked,{mode:0o700});
  const protectedFile=join(blocked,'canary.txt');
  await writeFile(protectedFile,'DONA_PRIVATE_TEST_CANARY',{mode:0o600});
  await writeFile(join(workspace,'input.txt'),'DONA_ALLOWED_TEST_CANARY',{mode:0o600});
  let networkReached=false;
  server=createServer(socket=>{networkReached=true;socket.destroy();});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const probe=`import fs from 'node:fs';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
const outside=${JSON.stringify(protectedFile)}, tests={};
const denied=fn=>{try{fn();return false;}catch(e){return ['EPERM','EACCES'].includes(e.code);}};
tests.allowedRead=fs.readFileSync('input.txt','utf8')==='DONA_ALLOWED_TEST_CANARY';
fs.writeFileSync('output.txt','DONA_OUTPUT'); tests.allowedWrite=fs.readFileSync('output.txt','utf8')==='DONA_OUTPUT';
tests.deniedRead=denied(()=>fs.readFileSync(outside));
tests.deniedWrite=denied(()=>fs.writeFileSync(outside,'UNEXPECTED'));
fs.symlinkSync(outside,'escape-link'); tests.deniedSymlinkRead=denied(()=>fs.readFileSync('escape-link'));
try{execFileSync('/bin/cat',[outside],{stdio:['ignore','pipe','pipe']});tests.deniedChildRead=false;}
catch(e){tests.deniedChildRead=/Operation not permitted|Permission denied/.test(String(e.stderr));}
tests.deniedNetwork=await new Promise(resolve=>{
const socket=net.createConnection({host:'127.0.0.1',port:${port}});
const timer=setTimeout(()=>{socket.destroy();resolve(false);},1500);
socket.on('connect',()=>{clearTimeout(timer);socket.destroy();resolve(false);});
socket.on('error',e=>{clearTimeout(timer);resolve(['EPERM','EACCES'].includes(e.code));});
});
console.log('DONA_ISOLATION_RESULT='+JSON.stringify(tests));
if(!Object.values(tests).every(v=>v===true))process.exitCode=1;`;
  await writeFile(join(workspace,'probe.mjs'),probe,{mode:0o600});
  const node=await realpath(process.execPath);
  const settings={network:{allowedDomains:[],deniedDomains:[],allowUnixSockets:[],allowLocalBinding:false},
    filesystem:{denyRead:['/'],allowRead:[workspace,node,'/System','/usr','/bin','/sbin','/dev','/private/etc','/Library/Apple'],
      allowWrite:[workspace],denyWrite:[]},enableWeakerNestedSandbox:false,enableWeakerNetworkIsolation:false,allowAppleEvents:false};
  const config=join(root,'sandbox.json');
  await writeFile(config,JSON.stringify(settings),{mode:0o600});
  console.error('Sprawdzam izolację na sztucznych plikach (maksymalnie 20 sekund)…');
  const result=await runProcess({executable:node,args:[cli,'--settings',config,node,join(workspace,'probe.mjs')],cwd:workspace,
    env:childEnvironment({home:homedir(),path:process.env.PATH.split(':').filter(p=>p.startsWith('/')).join(':')}),timeoutMs:20000});
  const line=result.stdout.split(/\r?\n/).find(line=>line.startsWith('DONA_ISOLATION_RESULT='));
  if(line) report.checks=JSON.parse(line.slice('DONA_ISOLATION_RESULT='.length));
  report.canaryUnchanged=await readFile(protectedFile,'utf8')==='DONA_PRIVATE_TEST_CANARY';
  report.networkReached=networkReached;
  report.passed=result.ok===true && report.canaryUnchanged && !networkReached
    && report.checks && Object.keys(report.checks).length===7 && Object.values(report.checks).every(v=>v===true);
  if(!report.passed) report.diagnostic=result.stderr.replaceAll(homedir(),'[HOME]').replaceAll(root,'[TEST_DIR]').slice(-1800);
  report.note='This verifies synthetic boundaries only; CLI authentication inside isolation remains unverified.';
} catch(error) {
  report.passed=false;
  report.error=['MACOS_REQUIRED','RUNTIME_VERSION_MISMATCH'].includes(error.message)?error.message:'ISOLATION_CHECK_SETUP_FAILED';
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(root)await rm(root,{recursive:true,force:true});
}
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
