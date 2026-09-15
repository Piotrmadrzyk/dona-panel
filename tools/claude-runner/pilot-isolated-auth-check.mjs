// Authentication-status commands only. No model prompts, task claims or token copies.
import { access, mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcess } from './pilot-process.mjs';
import { childEnvironment } from './model-router.mjs';
const report={modelTaskStarted:false,queueTouched:false,isolationVerified:false,checks:[]};
const selected=process.argv.slice(2);
const engines=selected.length===0?['claude','codex']:selected;
function safeDiagnostic(value) {
  return value
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'')
    .replace(/(?:bearer\s+)[^\s"']+/gi,'Bearer [REDACTED]')
    .replace(/(["']?(?:access_token|refresh_token|id_token|api_key|authorization|password|secret)["']?\s*[:=]\s*)[^\r\n]+/gi,'$1[REDACTED]')
    .replace(/https?:\/\/[^\s"']+/g,'[URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[EMAIL]')
    .replace(/\/Users\/[^/\s]+/g,'[HOME]')
    .replace(/[A-Za-z0-9_+\/.=-]{32,}/g,'[REDACTED]')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'')
    .trim().slice(0,1200);
}
let root;
try {
  if(engines.some(e=>!['claude','codex'].includes(e))) throw new Error('INVALID_ENGINE');
  if(process.platform!=='darwin') throw new Error('MACOS_REQUIRED');
  const cli=fileURLToPath(new URL('./isolation/node_modules/@anthropic-ai/sandbox-runtime/dist/cli.js',import.meta.url));
  const pkg=JSON.parse(await readFile(new URL('./isolation/node_modules/@anthropic-ai/sandbox-runtime/package.json',import.meta.url),'utf8'));
  if(pkg.version!=='0.0.76') throw new Error('RUNTIME_VERSION_MISMATCH');
  const dirs=[...new Set((process.env.PATH||'').split(':').filter(p=>p.startsWith('/')))];
  const env=childEnvironment({home:homedir(),path:dirs.join(':')});
  const node=await realpath(process.execPath), home=await realpath(homedir());
  root=await realpath(await mkdtemp(join(tmpdir(),'dona-auth-isolation-')));
  const workspace=join(root,'workspace'); await mkdir(workspace,{mode:0o700});
  const canary=join(root,'private-canary.txt');
  await writeFile(canary,'SYNTHETIC_PRIVATE_CANARY',{mode:0o600});
  for(const engine of engines) {
    console.error(`Sprawdzam ${engine} w ograniczonym środowisku…`);
    let binary;
    for(const dir of dirs) {
      try {await access(join(dir,engine),constants.X_OK);binary=await realpath(join(dir,engine));break;}
      catch {/* Continue through operator PATH. */}
    }
    if(!binary){report.checks.push({engine,passed:false,reason:'CLI_MISSING'});continue;}
    // Exact login files only. The CLI accesses its own credentials; the wrapper
    // never reads them. No entire HOME, Keychain directory or worker-key access.
    const loginFiles=engine==='claude' ? [join(home,'.claude.json'),join(home,'.claude','.credentials.json')]
      : [join(home,'.codex','auth.json')];
    const settings={network:{allowedDomains:[],deniedDomains:[],allowUnixSockets:[],allowLocalBinding:false},
      filesystem:{denyRead:['/'],allowRead:[workspace,node,binary,...loginFiles,
        '/System','/usr','/bin','/sbin','/dev','/private/etc','/Library/Apple'],allowWrite:[workspace],denyWrite:[]},
      enableWeakerNestedSandbox:false,enableWeakerNetworkIsolation:false,allowAppleEvents:false};
    const config=join(root,engine+'.json');await writeFile(config,JSON.stringify(settings),{mode:0o600});
    const probe=join(workspace,'probe.mjs');
    await writeFile(probe,`import fs from 'node:fs';
let denied=false;try{fs.readFileSync(${JSON.stringify(canary)});}catch(e){denied=['EPERM','EACCES'].includes(e.code);}
console.log(denied?'DONA_CANARY_DENIED':'DONA_CANARY_ACCESSIBLE');if(!denied)process.exitCode=1;`,{mode:0o600});
    const boundary=await runProcess({executable:node,args:[cli,'--settings',config,node,probe],cwd:workspace,env,timeoutMs:20000});
    if(!boundary.ok || boundary.stdout.trim()!=='DONA_CANARY_DENIED') {
      report.checks.push({engine,passed:false,reason:'BOUNDARY_NOT_CONFIRMED'});continue;
    }
    const variants=engine==='codex'?['default','ignore_user_config']:['default'];
    for(const variant of variants) {
    const args=engine==='claude'?['auth','status']:
      [...(variant==='ignore_user_config'?['--ignore-user-config']:[]),'login','status'];
    const result=await runProcess({executable:node,args:[cli,'--settings',config,binary,...args],cwd:workspace,env,timeoutMs:30000});
    let authenticated=false,statusReadable=false;
    if(engine==='claude') {
      try {const status=JSON.parse(result.stdout);statusReadable=typeof status.loggedIn==='boolean';
        authenticated=status.loggedIn===true && status.authMethod==='claude.ai' && status.apiProvider==='firstParty';}catch{}
    } else {
      const text=result.stdout+'\n'+result.stderr;
      authenticated=/^Logged in using ChatGPT\s*$/m.test(text);
      statusReadable=authenticated || /^Not logged in\s*$/m.test(text);
    }
    const output=result.stdout+'\n'+result.stderr;
    const reason=authenticated&&result.ok?'AUTH_VISIBLE':result.timedOut?'TIMEOUT':statusReadable?'AUTH_NOT_VISIBLE'
      :/Operation not permitted|Permission denied|EACCES|EPERM/.test(output)?'ACCESS_DENIED'
      :/Cannot find module|ERR_MODULE_NOT_FOUND/.test(output)?'CLI_DEPENDENCY_BLOCKED':'CLI_STATUS_UNREADABLE';
    // Labels plus a redacted startup diagnostic for unreadable Codex status only.
    const diagnosticFlags=[
      ['permission_denied',/operation not permitted|permission denied|EACCES|EPERM|os error (?:1|13)\b/i],
      ['missing_file',/no such file|ENOENT|os error 2\b/i],
      ['configuration',/config(?:uration|\.toml)?/i],
      ['keychain',/keychain|securityd|SecItem/i],
      ['credentials',/credential|auth\.json|authentication/i],
      ['temporary_directory',/temp(?:orary)? dir|\.tmp|mkdtemp/i],
      ['logging',/log directory|log file|logging|tracing/i],
      ['dependency',/cannot find module|ERR_MODULE_NOT_FOUND|missing optional dependency/i],
      ['unsupported_option',/unexpected argument|unknown option|unrecognized option/i],
      ['sandbox',/sandbox|seatbelt|mach-lookup/i],
    ].filter(([,pattern])=>pattern.test(output)).map(([label])=>label);
    report.checks.push({engine,variant,passed:authenticated&&result.ok,canaryDenied:true,statusReadable,reason,
      exitCode:result.exitCode,diagnosticFlags,outputPresent:output.trim().length>0,
      ...(engine==='codex'&&!statusReadable?{diagnostic:safeDiagnostic(output)}:{})});
    }
  }
  report.passed=report.checks.length>0&&report.checks.every(c=>c.passed);
  report.note='Authentication visibility only. No model execution or complete isolation approval.';
} catch(error) {
  report.passed=false;
  report.error=['MACOS_REQUIRED','RUNTIME_VERSION_MISMATCH','INVALID_ENGINE'].includes(error.message)?error.message:'CHECK_SETUP_FAILED';
} finally {if(root)await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
