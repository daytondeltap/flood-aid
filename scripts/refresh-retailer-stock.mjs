import fs from 'node:fs/promises';
import vm from 'node:vm';
import {DOMParser} from 'linkedom';
import {pathToFileURL} from 'node:url';
const providers=[
 {id:'kfc',name:'KFC',host:'www.kfc.co.th',seed:'https://www.kfc.co.th/menu',product:/^\/menu/},
 {id:'mcdonalds',name:"McDonald's",host:'www.mcdonalds.co.th',seed:'https://www.mcdonalds.co.th/mcDelivery/category/burger?lang=en',product:/^\/mcDelivery\/[^/]+\/basic\//},
 {id:'makro',name:'Makro',host:'www.makro.pro',seed:'https://www.makro.pro/en/c/beverages/drinking-water',product:/^\/en\/p\//},
 {id:'7-eleven',name:'7-Eleven',host:'www.allonline.7eleven.co.th',seed:'https://www.allonline.7eleven.co.th/supermarket/beverages-and-powder-tonics/beverage/drinking-water/',product:/\/p\/|\/product\//},
 {id:'bigc',name:'Big C',host:'www.bigc.co.th',seed:'https://www.bigc.co.th/en/category/drinking-water',product:/^\/en\/(?:v2\/)?product\//}
];
const context={window:{},DOMParser,URL,Date};vm.createContext(context);vm.runInContext(await fs.readFile('web/stock-metadata.js','utf8'),context);
const parse=context.window.StockMetadata.parse;
vm.runInContext(await fs.readFile('web/inventory-core.js','utf8'),context);
const category=row=>context.window.InventoryCore.category(row);
const extraSeeds={
 mcdonalds:['https://www.mcdonalds.co.th/mcDelivery/category/bic_rice?lang=en'],
 makro:['https://www.makro.pro/en/c/dry-grocery/grains-rice-cereal','https://www.makro.pro/en/c/household-supplies/household-paper-products','https://www.makro.pro/en/c/health-beauty/personal-care','https://www.makro.pro/en/c/mom-baby/baby-care','https://www.makro.pro/en/c/office-supplies/batteries','https://www.makro.pro/en/c/health-beauty/health-care','https://www.makro.pro/en/c/buymoresavemore/cleaning-supplies'],
 bigc:['https://www.bigc.co.th/en/group/fp-instant-noodles','https://www.bigc.co.th/en/category/tissue-paper','https://www.bigc.co.th/en/category/baby-diapers']
};
export function productLinks(html,provider){const doc=new DOMParser().parseFromString(html,'text/html'),seen=new Map();for(const a of doc.querySelectorAll('a[href]')){try{const u=new URL(a.getAttribute('href'),provider.seed);u.search='';u.hash='';if(u.protocol!=='https:'||u.hostname!==provider.host||!provider.product.test(u.pathname))continue;const name=(a.textContent.trim()||a.getAttribute('title')||a.querySelector('img')?.getAttribute('alt')||'').replace(/\s+/g,' ').trim();if(name&&name.length>(seen.get(u.href)?.length||0))seen.set(u.href,name.slice(0,240))}catch{}}return [...seen].map(([url,name])=>({url,name}))}

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

export function restaurantMenu(html,p,now=Date.now()){
 const doc=new DOMParser().parseFromString(html,'text/html'),rows=[];
 const cards=p.id==='kfc'?doc.querySelectorAll('[id="Rice & Bowls"] .plp-item-card,[id="For One"] .plp-item-card'):doc.querySelectorAll('.product-grid');
 for(const card of cards){const productName=(p.id==='kfc'?card.querySelector('[data-testid="plp-menu-card-header"]')?.textContent:card.getAttribute('data-title')||card.querySelector('.name')?.textContent)?.trim();const productId=p.id==='kfc'?card.id:card.querySelector('[data-order-item-id]')?.getAttribute('data-order-item-id');const value=p.id==='kfc'?p.seed+'#'+card.id:card.querySelector('[data-href]')?.getAttribute('data-href');if(!productName||!productId||!value)continue;try{const u=new URL(value,p.seed);if(u.protocol!=='https:'||u.hostname!==p.host||u.username||u.password||!p.product.test(u.pathname))continue;rows.push({provider:p.id,productName,productId,url:u.href,status:'unknown',quantity:null,unit:'',scope:'online',branchName:'',lat:null,lng:null,checkedAt:now,menuListing:true,linkType:p.id==='kfc'?'menu':'product',method:'Official menu listing'})}catch{}}
 return [...new Map(rows.map(r=>[r.productId,r])).values()];
}

export async function collectProvider(provider,read,previous=[],now=Date.now()){
 const rows=[];let failures=0;
 try{const html=await read(provider.seed,provider);if(['kfc','mcdonalds'].includes(provider.id)){const rows=restaurantMenu(html,provider,now);return {rows,provider:{id:provider.id,name:provider.name,state:rows.length?'read':'unknown',checkedAt:now}}}const links=productLinks(html,provider);const category=parse(html,provider.seed,now);rows.push(...category.filter(r=>r.productName!=='Unnamed product'),...hydrationStock(html,provider,now));
  for(const item of links.slice(0,12)){if(rows.some(r=>r.url===item.url))continue;try{const page=await read(item.url,provider);const offers=parse(page,item.url,now);const pageDoc=new DOMParser().parseFromString(page,'text/html');const productName=(pageDoc.querySelector('meta[property="og:title"]')?.getAttribute('content')||pageDoc.querySelector('h1')?.textContent||item.name).replace(/\s+/g,' ').trim().slice(0,240);rows.push(...(offers.length?offers:[{productName,productId:item.url,url:item.url,status:'unknown',quantity:null,unit:'',scope:'online',branchName:'',lat:null,lng:null,checkedAt:now,method:'Product listing'}]))}catch{failures++}}
  if(provider.id==='7-eleven')for(const row of rows){try{const u=new URL(row.url);const match=u.pathname.match(/^\/p\/([^/]+)\/\d+\/?$/);if(u.hostname===provider.host&&match){const label=decodeURIComponent(match[1]).replace(/-/g,' ').trim();if(label.length>row.productName.length)row.productName=label.slice(0,240)}}catch{}}
  const unique=new Map(rows.map(r=>[`${r.productId}|${r.branchName}|${r.url}`,{...r,provider:provider.id}]));return {rows:[...unique.values()],provider:{id:provider.id,name:provider.name,state:rows.length?(failures?'partial':'read'):'unknown',checkedAt:now}};
 }catch{return {rows:previous.map(r=>({...r,status:'unknown',quantity:null,sourceUnavailable:true})),provider:{id:provider.id,name:provider.name,state:'unavailable',checkedAt:null}}}
}
async function readPage(url,p){let u=new URL(url);for(let hop=0;hop<4;hop++){if(u.protocol!=='https:'||u.hostname!==p.host||u.username||u.password)throw Error('Unsupported source');const r=await fetch(u,{redirect:'manual',headers:{'User-Agent':'FloodAidBangkok/3.3 (public product availability)','Accept':'text/html'},signal:AbortSignal.timeout(15000)});if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw Error('Missing redirect');u=new URL(location,u);continue}if(!r.ok)throw Error('Retailer page unavailable');const html=await r.text();if(html.length>5_000_000)throw Error('Page too large');return html}throw Error('Too many redirects')}
async function main(){const out='web/data/retailer-stock.json';let prior={rows:[]};try{prior=JSON.parse(await fs.readFile(out,'utf8'))}catch{}
 if(process.env.RETAILER_SEED_FILE)try{const baseline=JSON.parse(await fs.readFile(process.env.RETAILER_SEED_FILE,'utf8'));const keys=new Set(prior.rows.map(r=>r.provider+'|'+r.productId));for(const row of baseline.rows||[])if(!keys.has(row.provider+'|'+row.productId))prior.rows.push(row)}catch{}
 const results=[];for(const p of providers){const seeds=[p.seed,...(extraSeeds[p.id]||[])];const checks=[];for(const seed of seeds)checks.push(await collectProvider({...p,seed},readPage,prior.rows.filter(r=>r.provider===p.id)));const rows=new Map();for(const check of checks)for(const row of check.rows){if(category(row)==='other'&&p.id!=='7-eleven'&&!row.menuListing)continue;const key=row.productId+'|'+row.branchName;const old=rows.get(key);if(!old||!row.sourceUnavailable&&(!old.checkedAt||row.checkedAt>=old.checkedAt))rows.set(key,row)}const readable=checks.some(r=>r.provider.state==='read'||r.provider.state==='partial');const r={rows:[...rows.values()],provider:{id:p.id,name:p.name,state:readable?'read':'unavailable',checkedAt:readable?Date.now():null}};results.push(r);console.log(p.name+': '+r.provider.state+' ('+r.rows.length+' items)')}
 await fs.mkdir('web/data',{recursive:true});await fs.writeFile(out,JSON.stringify({rows:results.flatMap(r=>r.rows),providers:results.map(r=>r.provider),retrievedAt:Date.now()},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
