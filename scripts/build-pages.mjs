import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
await fs.rm('dist',{recursive:true,force:true});
await fs.cp('web','dist',{recursive:true});
const core=await fs.readFile('worker/core.mjs','utf8');
await fs.writeFile('dist/core.js',core.replace(/export /g,'')+'\nwindow.FloodCore={FRESH_MS,ITEMS,finite,pointValid,kmBetween,fresh,normalizeWater,trend,pointToSegmentKm,assessRoute,latestReports,validateReport};');
const key=process.env.GOOGLE_MAPS_BROWSER_KEY||'';
if(key&&!/^[A-Za-z0-9_-]{20,200}$/.test(key))throw Error('Invalid browser API key format');
await fs.writeFile('dist/config.js','window.FLOODAID_CONFIG='+JSON.stringify({googleMapsBrowserKey:key})+';\n');
const html=await fs.readFile('dist/index.html','utf8');
let versioned=html;
for(const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)){const asset=match[1];const bytes=await fs.readFile('dist/'+asset);const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);versioned=versioned.replaceAll('\"'+asset+'\"','\"'+asset+'?v='+hash+'\"')}
await fs.writeFile('dist/index.html',versioned);
await fs.writeFile('dist/.nojekyll','');
console.log('Built GitHub Pages frontend. No server credentials are included.');
