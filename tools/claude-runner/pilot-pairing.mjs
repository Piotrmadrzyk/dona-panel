// Local preparation only. No network, CLI login changes, queue or agent calls.
import { constants } from 'node:fs';
import { mkdir, realpath, lstat, open } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

try {
  const home = await realpath(homedir());
  const directory = join(home,'.dona-router-pilot');
  await mkdir(directory,{mode:0o700}).catch(error => {if(error.code!=='EEXIST') throw error;});
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid!==userInfo().uid
    || (stat.mode & 0o077)!==0 || await realpath(directory)!==directory)
    throw new Error('UNSAFE_DIRECTORY');
  const path = join(directory,'worker.key');
  let handle, created=false, token;
  try {
    try {
      handle=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
      created=true; token=randomBytes(32).toString('hex');
      await handle.writeFile(token,'utf8'); await handle.sync();
    } catch(error) {
      if(error.code!=='EEXIST') throw error;
      handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
      const file=await handle.stat();
      if(!file.isFile() || file.uid!==userInfo().uid || file.nlink!==1 || file.size!==64 || (file.mode & 0o077)!==0)
        throw new Error('UNSAFE_KEY_FILE');
      token=await handle.readFile('utf8');
    }
    if(!/^[a-f0-9]{64}$/.test(token)) throw new Error('INVALID_KEY');
    console.log(JSON.stringify({runnerId:'mac-dona-pilot',tokenHash:createHash('sha256').update(token).digest('hex'),
      keyCreated:created,keyPrinted:false,networkUsed:false,agentStarted:false},null,2));
  } finally {await handle?.close();}
} catch {
  console.error('PAIRING_PREPARATION_FAILED: nie zmieniaj ręcznie pliku klucza; przekaż ten komunikat.');
  process.exitCode=1;
}
