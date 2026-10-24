import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./check.mjs',import.meta.url))],{stdio:'inherit'});
if(result.status!==0) process.exit(1);
console.log('Build ready: dist/ is the complete static output; no dependency installation or compilation required.');
