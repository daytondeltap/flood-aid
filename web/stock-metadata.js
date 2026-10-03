'use strict';
// Parse inert retailer markup; never execute scripts or infer branch stock from a listing.
window.StockMetadata={parse(html,url='',now=Date.now()){
 const doc=new DOMParser().parseFromString(String(html),'text/html'),products=[],nodes=[],byId=new Map();
 const safe=v=>{try{const u=new URL(v,url||undefined);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const type=(n,t)=>[].concat(n?.['@type']||[]).some(v=>String(v).split(/[\/#]/).pop()===t);
 const walk=v=>{if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){nodes.push(v);if(v['@id'])byId.set(v['@id'],v);Object.values(v).forEach(walk)}};
 for(const script of doc.querySelectorAll('script[type="application/ld+json"]'))try{walk(JSON.parse(script.textContent))}catch{}
 const resolve=v=>v&&typeof v==='object'&&v['@id']?{...byId.get(v['@id']),...v}:v;
 const status=v=>({InStock:'available',LimitedAvailability:'limited',OutOfStock:'unavailable',SoldOut:'unavailable',Discontinued:'unavailable',PreOrder:'preorder',PreSale:'preorder',BackOrder:'backorder',OnlineOnly:'online'})[String(v||'').split(/[\/#]/).pop()]||'unknown';
 function add(product,offer,method){offer=resolve(offer)||{};const place=resolve([].concat(offer.availableAtOrFrom||[])[0]);const geo=resolve(place?.geo);const lat=Number(geo?.latitude),lng=Number(geo?.longitude);const branch=!!place?.name&&geo?.latitude!=null&&geo?.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
 const raw=resolve(offer.inventoryLevel)?.value;const qty=raw!==null&&raw!==undefined&&raw!==''&&typeof raw!=='boolean'&&Number.isFinite(Number(raw))&&Number(raw)>=0?Number(raw):null;
 const expires=Date.parse(offer.availabilityEnds||offer.validThrough||product.expirationDate||'');const expired=Number.isFinite(expires)&&expires<now;
 const name=String(product.name||offer.name||'Unnamed product').slice(0,240),link=safe(offer.url||product.url||url);
 products.push({productName:name,productId:String(product.sku||product.productID||product['@id']||name).slice(0,240),status:expired?'unknown':qty===0?'unavailable':status(offer.availability),quantity:expired?null:qty,unit:String(resolve(offer.inventoryLevel)?.unitText||'units').slice(0,40),scope:branch?'branch':'online',branchName:branch?String(place.name).slice(0,240):'',lat:branch?lat:null,lng:branch?lng:null,url:link,method,checkedAt:now,expired});}
 for(const n of nodes.filter(n=>type(n,'Product'))){for(const o of [].concat(n.offers||[])){const offer=resolve(o);if(type(offer,'AggregateOffer')){for(const child of [].concat(offer.offers||[]))add(n,child,'JSON-LD');if(!offer.offers)add(n,{},'JSON-LD');}else add(n,offer,'JSON-LD')}}
 // Microdata must be scoped to the same product/offer, rather than unrelated page-wide tags.
 if(!products.length)for(const product of doc.querySelectorAll('[itemscope][itemtype$="/Product"]')){const val=(root,k)=>{const e=root.querySelector(`[itemprop="${k}"]`);return e?.getAttribute('content')||e?.getAttribute('href')||e?.textContent||''};const offers=product.querySelectorAll('[itemprop="offers"]');for(const offer of offers)add({name:val(product,'name'),sku:val(product,'sku')},{availability:val(offer,'availability'),url:val(offer,'url'),inventoryLevel:{value:val(offer,'inventoryLevel')}},'Microdata')}
 if(!products.length){const meta=k=>doc.querySelector(`meta[property="${k}"],meta[name="${k}"]`)?.getAttribute('content')||'';const availability=meta('product:availability');if(availability){const mapped=({'in stock':'InStock',instock:'InStock','out of stock':'OutOfStock',outofstock:'OutOfStock','available for order':'PreOrder'})[availability.toLowerCase()]||availability;add({name:meta('og:title')},{availability:mapped,url:meta('og:url')},'Product meta tags')}}
 const unique=new Map(products.map(p=>[`${p.productId}|${p.branchName}|${p.url}`,p]));return [...unique.values()];
}};
