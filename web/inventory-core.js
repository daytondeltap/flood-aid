'use strict';
window.InventoryCore={
 fresh(row,now=Date.now()){return Number.isFinite(row.observedAt)&&row.observedAt<=now+60000&&now-row.observedAt<=15*60000},
 safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}},
 nearby(rows,origin,radius,provider,search,now=Date.now()){
 return rows.filter(r=>r&&typeof r.branchName==='string'&&typeof r.productName==='string'&&typeof r.branchId==='string'&&typeof r.productId==='string'&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&window.FloodCore.pointValid(r.lat,r.lng)&&Number.isFinite(r.observedAt)&&r.observedAt<=now+60000&&(r.quantity===null||Number.isFinite(r.quantity)&&r.quantity>=0)&&['available','limited','unavailable','unknown'].includes(r.status)&&(provider==='all'||r.provider===provider)&&`${r.branchName} ${r.productName}`.toLowerCase().includes(search.toLowerCase())).map(r=>({...r,distance:window.FloodCore.kmBetween(origin,r)})).filter(r=>r.distance<=radius).sort((a,b)=>a.distance-b.distance);
 }
};
