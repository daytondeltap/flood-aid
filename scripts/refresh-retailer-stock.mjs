import fs from 'node:fs/promises';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {pathToFileURL} from 'node:url';
const providers=[
 {id:'makro',name:'Makro',host:'www.makro.pro',seed:'https://www.makro.pro/en/c/beverages/drinking-water',product:/^\/en\/p\//},
 {id:'7-eleven',name:'7-Eleven',host:'www.allonline.7eleven.co.th',seed:'https://www.allonline.7eleven.co.th/supermarket/beverages-and-powder-tonics/beverage/drinking-water/',product:/\/p\/|\/product\//},
 {id:'bigc',name:'Big C',host:'www.bigc.co.th',seed:'https://www.bigc.co.th/en/category/drinking-water',product:/^\/en\/(?:v2\/)?product\//}
];
const context={window:{},DOMParser,URL,Date};vm.createContext(context);vm.runInContext(await fs.readFile('web/stock-metadata.js','utf8'),context);
const parse=context.window.StockMetadata.parse;
export function productLinks(html,provider){const doc=new DOMParser().parseFromString(html,'text/html'),seen=new Map();for(const a of doc.querySelectorAll('a[href]')){try{const u=new URL(a.getAttribute('href'),provider.seed);u.search='';u.hash='';if(u.protocol!=='https:'||u.hostname!==provider.host||!provider.product.test(u.pathname))continue;const name=(a.getAttribute('title')||a.querySelector('img')?.getAttribute('alt')||a.textContent).replace(/\s+/g,' ').trim();if(name)seen.set(u.href,name.slice(0,240))}catch{}}return [...seen].map(([url,name])=>({url,name}))}

export function hydrationStock(html,p,now=Date.now()){
 const doc=new DOMParser().parseFromString(html,'text/html'),payloads=[],rows=[],links=productLinks(html,p);
 try{const next=doc.querySelector('#__NEXT_DATA__');if(next)payloads.push(JSON.parse(next.textContent).props?.pageProps)}catch{}
 const flight=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)].map(m=>{try{return JSON.parse(m[1])}catch{return ''}}).join('');
 for(const line of flight.split('\n'))try{payloads.push(JSON.parse(line.slice(line.indexOf(':')+1)))}catch{}
 const walk=n=>{if(!n||typeof n!=='object')return;
  if(!Array.isArray(n)){
   let id,name,status,url;
   if(p.id==='makro'&&n.productId&&n.sku&&(n.titleEn||n.title)){id=String(n.productId);name=n.titleEn||n.title;status=n.inStock===1||n.inStock===true?'available':n.inStock===0||n.inStock===false?'unavailable':'unknown';url=links.find(l=>l.url.endsWith('-'+id))?.url}
   if(p.id==='bigc'&&n.product_id&&n.sku&&n.name&&n.slug){id=String(n.product_id);name=n.name;status=n.not_for_sale===true||n.not_for_sale===1?'unavailable':n.is_pre_order===true||n.is_pre_order===1?'preorder':n.stock==='Y'?'available':n.stock==='N'?'unavailable':'unknown';url=links.find(l=>l.url.endsWith('.'+id))?.url}
   if(id&&url)rows.push({productName:String(name).slice(0,240),productId:id,provider:p.id,url,status,quantity:null,unit:'',scope:'online',branchName:'',lat:null,lng:null,checkedAt:now,method:'Retailer page stock flag',productNameTh:p.id==='makro'?String(n.searchTitle?.TH||'').slice(0,240):''});
  }
  Object.values(n).forEach(walk);
 };payloads.forEach(walk);return [...new Map(rows.map(r=>[r.productId,r])).values()];
}

export async function collectProvider(provider,read,previous=[],now=Date.now()){
 const rows=[];let failures=0;
 try{const html=await read(provider.seed,provider);const links=productLinks(html,provider);const category=parse(html,provider.seed,now);rows.push(...category.filter(r=>r.productName!=='Unnamed product'),...hydrationStock(html,provider,now));
  for(const item of links.slice(0,12)){if(rows.some(r=>r.url===item.url))continue;try{const page=await read(item.url,provider);const offers=parse(page,item.url,now);rows.push(...(offers.length?offers:[{productName:item.name,productId:item.url,url:item.url,status:'unknown',quantity:null,unit:'',scope:'online',branchName:'',lat:null,lng:null,checkedAt:now,method:'Product listing'}]))}catch{failures++}}
  const unique=new Map(rows.map(r=>[`${r.productId}|${r.branchName}|${r.url}`,{...r,provider:provider.id}]));return {rows:[...unique.values()],provider:{id:provider.id,name:provider.name,state:rows.length?(failures?'partial':'read'):'unknown',checkedAt:now}};
 }catch{return {rows:previous.map(r=>({...r,status:'unknown',quantity:null,sourceUnavailable:true})),provider:{id:provider.id,name:provider.name,state:'unavailable',checkedAt:null}}}
}
async function readPage(url,p){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!==p.host||u.username||u.password)throw Error('Unsupported source');const r=await fetch(u,{redirect:'manual',headers:{'User-Agent':'FloodAidBangkok/3.3 (public product availability)','Accept':'text/html'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Retailer page unavailable');const html=await r.text();if(html.length>5_000_000)throw Error('Page too large');return html}
async function main(){const out='web/data/retailer-stock.json';let prior={rows:[]};try{prior=JSON.parse(await fs.readFile(out,'utf8'))}catch{}
 const results=[];for(const p of providers){const seeds=[p.seed,...(p.id==='makro'?['https://www.makro.pro/en/c/dry-grocery/grains-rice-cereal']:p.id==='bigc'?['https://www.bigc.co.th/en/group/fp-instant-noodles']:[])];const checks=[];for(const seed of seeds)checks.push(await collectProvider({...p,seed},readPage,prior.rows.filter(r=>r.provider===p.id)));const rows=new Map();for(const check of checks)for(const row of check.rows){const key=row.productId+'|'+row.branchName;const old=rows.get(key);if(!old||!row.sourceUnavailable&&(!old.checkedAt||row.checkedAt>=old.checkedAt))rows.set(key,row)}const readable=checks.some(r=>r.provider.state==='read'||r.provider.state==='partial');const r={rows:[...rows.values()],provider:{id:p.id,name:p.name,state:readable?'read':'unavailable',checkedAt:readable?Date.now():null}};results.push(r);console.log(p.name+': '+r.provider.state+' ('+r.rows.length+' items)')}
 await fs.mkdir('web/data',{recursive:true});await fs.writeFile(out,JSON.stringify({rows:results.flatMap(r=>r.rows),providers:results.map(r=>r.provider),retrievedAt:Date.now()},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
