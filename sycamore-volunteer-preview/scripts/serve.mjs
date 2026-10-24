import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 if(!(await stat(file)).isFile()) throw new Error('Not a file');
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}});
server.on('error',e=>{console.error(e.message);process.exit(1)});
server.listen(port,'127.0.0.1',()=>console.log(`Volunteer preview: http://127.0.0.1:${port}/#/discover`));
