'use strict';
window.InventoryCore={
 productURL(row){const hosts={'7-eleven':['www.allonline.7eleven.co.th','allonline.7eleven.co.th'],makro:['www.makro.pro'],bigc:['www.bigc.co.th'],kfc:['www.kfc.co.th'],mcdonalds:['www.mcdonalds.co.th']};try{const u=new URL(this.safeURL(row.url));return hosts[row.provider]?.includes(u.hostname)?u.href:''}catch{return ''}},
 category(row){if(row.menuListing)return 'meals:'+row.provider;const n=`${row.productName||''} ${row.productNameTh||''}`.toLowerCase();
  for(const [id,pattern] of [
   ['power',/batter(?:y|ies)|torchlight|flashlight|ถ่าน(?:ไฟฉาย)?|ไฟฉาย/],
   ['sanitary',/sanitary|tampon|ผ้าอนามัย/],
   ['baby',/diaper|napp(?:y|ies)|baby.*(?:wipe|milk|formula)|ผ้าอ้อม|นมผงเด็ก|นมผงทารก|ทิชชู่เปียกเด็ก/],
   ['care',/bandage|gauze|medical mask|face mask|cotton (?:ball|pad)|antiseptic|พลาสเตอร์|หน้ากาก|สำลี|ผ้าก๊อซ/],
   ['hygiene',/tissue|toilet paper|wipe|soap|toothpaste|toothbrush|sanitizer|ทิชชู่|กระดาษชำระ|สบู่|ยาสีฟัน|แปรงสีฟัน|เจลล้างมือ/],
   ['cleaning',/detergent|disinfectant|garbage bag|trash bag|dish ?wash|ผงซักฟอก|น้ำยาซัก|น้ำยาล้างจาน|ถุงขยะ/],
   ['water',/drinking water|mineral water|น้ำดื่ม|น้ำแร่/],
   ['food',/rice|noodle|cereal|canned|tuna|sardine|ข้าว|บะหมี่|ปลากระป๋อง/]
  ])if(pattern.test(n))return id;
  return 'other';
 },
 preview(rows,limit=12){const branches=rows.filter(r=>r.scope==='branch');const groups=new Map();for(const r of rows.filter(r=>r.scope!=='branch')){const key=this.category(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}const result=branches.slice(0,limit);while(result.length<limit&&groups.size){for(const [key,group] of groups){result.push(group.shift());if(!group.length)groups.delete(key);if(result.length===limit)break}}return result},
 fresh(row,now=Date.now()){return Number.isFinite(row.observedAt)&&row.observedAt<=now+60000&&now-row.observedAt<=15*60000},
 safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}},
 nearby(rows,origin,radius,provider,search,now=Date.now()){
 return rows.filter(r=>r&&typeof r.branchName==='string'&&typeof r.productName==='string'&&typeof r.branchId==='string'&&typeof r.productId==='string'&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&window.FloodCore.pointValid(r.lat,r.lng)&&Number.isFinite(r.observedAt)&&r.observedAt<=now+60000&&(r.quantity===null||Number.isFinite(r.quantity)&&r.quantity>=0)&&['available','limited','unavailable','unknown'].includes(r.status)&&(provider==='all'||r.provider===provider)&&`${r.branchName} ${r.productName}`.toLowerCase().includes(search.toLowerCase())).map(r=>({...r,distance:window.FloodCore.kmBetween(origin,r)})).filter(r=>r.distance<=radius).sort((a,b)=>a.distance-b.distance);
 }
};
