import fs from 'node:fs/promises';
import {DOMParser} from 'linkedom';
import '../web/disaster-core.js';
const file='web/data/disasters.json';
let old={sources:[]};try{old=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
const defs=[['USGS','https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson','usgs'],['NASA EONET','https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=90&limit=1000','eonet']];
defs.push(['GDACS','https://www.gdacs.org/xml/rss.xml','gdacs']);
const sources=await Promise.all(defs.map(async([name,url,parser])=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(r.status);const rows=parser==='gdacs'?DisasterCore.gdacs(await r.text(),new DOMParser()):DisasterCore[parser](await r.json());return {name,url,checkedAt:Date.now(),state:'ready',rows}}catch{const prev=old.sources.find(s=>s.name===name);return {...prev,name,url,state:'unavailable',rows:prev?.rows||[],checkedAt:prev?.checkedAt||null}}}));
await fs.writeFile(file,JSON.stringify({sources},null,2)+'\n');
for(const s of sources)console.log(s.name,s.state,s.rows.length);
