import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
for(const file of readdirSync(resolve(root,'dist/discover')).filter(f=>f.endsWith('.js'))){
 const r=spawnSync(process.execPath,['--check',resolve(root,'dist/discover',file)],{stdio:'inherit'}); if(r.status!==0) process.exit(1);
}
const html=readFileSync(resolve(root,'dist/index.html'),'utf8');
for(const [,src] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
 if(src.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(src) || src.includes('${')) continue;
 if(!existsSync(resolve(root,'dist',src))) throw new Error('Missing local asset: '+src);
}
for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
 if(!code.trim()) continue;
 const r=spawnSync(process.execPath,['--check','--input-type=commonjs'],{input:code,stdio:['pipe','inherit','inherit']}); if(r.status!==0) process.exit(1);
}
console.log('Syntax and local asset checks passed.');
