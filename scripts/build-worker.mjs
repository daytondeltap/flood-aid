import fs from 'node:fs/promises';
import path from 'node:path';
await fs.rm('worker-dist',{recursive:true,force:true});
await fs.mkdir('worker-dist/server',{recursive:true});
await fs.mkdir('worker-dist/.openai',{recursive:true});
const shared=await fs.readFile('worker/core.mjs','utf8');
await fs.writeFile('web/core.js',shared.replace(/export /g,'')+'\nwindow.FloodCore={FRESH_MS,ITEMS,finite,pointValid,kmBetween,fresh,normalizeWater,trend,pointToSegmentKm,assessRoute,latestReports,validateReport};');
const assets={};
for(const name of await fs.readdir('web')){if(!(await fs.stat(path.join('web',name))).isFile())continue;const buf=await fs.readFile(path.join('web',name));assets['/'+name]={body:buf.toString('base64'),type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream'};}
const core=await fs.readFile('worker/core.mjs','utf8'),server=await fs.readFile('worker/index.mjs','utf8');
await fs.writeFile('worker-dist/server/index.js',`const ASSETS=${JSON.stringify(assets)};\n${core.replace(/export /g,'')}\n${server.replace(/^import .*from '\.\/core\.mjs';\n/m,'')}`);
await fs.writeFile('worker-dist/server/package.json','{"type":"module"}');
await fs.writeFile('worker-dist/.openai/hosting.json',JSON.stringify({d1:'DB'}));
await fs.cp('drizzle','worker-dist/.openai/drizzle',{recursive:true});
console.log('Built Worker, static assets and D1 migrations.');
