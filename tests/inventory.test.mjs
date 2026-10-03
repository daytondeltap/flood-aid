import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {kmBetween,pointValid} from '../worker/core.mjs';
const window={FloodCore:{kmBetween,pointValid}};
vm.runInNewContext(fs.readFileSync('web/inventory-core.js','utf8'),{window,URL,Date});
const core=window.InventoryCore,now=Date.now(),origin={lat:13.812,lng:100.731};
const row={branchId:'b1',branchName:'Makro branch',productId:'p1',productName:'Water',provider:'makro',lat:13.813,lng:100.731,quantity:0,status:'unavailable',observedAt:now};
test('inventory distances use device origin and filters do not infer missing counts',()=>{const result=core.nearby([row,{...row,branchId:'b2',lat:13.99}],origin,1,'makro','water',now);assert.equal(result.length,1);assert.equal(result[0].quantity,0);assert.equal(core.nearby([row],origin,1,'7-eleven','',now).length,0);assert.equal(core.nearby([{...row,quantity:null}],origin,1,'all','',now)[0].quantity,null)});
test('inventory freshness rejects future and old readings',()=>{assert.equal(core.fresh(row,now),true);assert.equal(core.fresh({...row,observedAt:now-16*60000},now),false);assert.equal(core.fresh({...row,observedAt:now+120000},now),false);assert.equal(core.nearby([{...row,lat:NaN},{...row,quantity:-1},{...row,observedAt:now+120000}],origin,20,'all','',now).length,0)});
test('retailer links require HTTPS',()=>{assert.equal(core.safeURL('javascript:alert(1)'), '');assert.equal(core.safeURL('https://token@host.example/'),'')});

test('default stock preview includes non-food essentials even when water fills the first category',()=>{const rows=[...Array.from({length:20},(_,i)=>({productName:'Drinking Water '+i,scope:'online'})),...['Bar Soap','Baby Diapers XL','AA Batteries','Sanitary Napkin','Medical Mask','Laundry Detergent','Jasmine Rice'].map(productName=>({productName,scope:'online'}))];const preview=core.preview(rows,12);assert.equal(preview.length,12);for(const name of ['Bar Soap','Baby Diapers XL','AA Batteries','Sanitary Napkin','Medical Mask','Laundry Detergent','Jasmine Rice'])assert.ok(preview.some(r=>r.productName===name));assert.equal(core.category({productName:'ผ้าอนามัยกลางคืน'}),'sanitary');assert.equal(core.category({productName:'ถุงขยะ'}),'cleaning')});
test('stock preview preserves nearest branch results and does not change inventory evidence',()=>{const nearby={productName:'Soap',scope:'branch',distance:0.1,quantity:null,status:'unknown'};const preview=core.preview([{productName:'Drinking Water',scope:'online'},nearby]);assert.equal(preview[0],nearby);assert.equal(preview[0].status,'unknown');assert.equal(preview[0].quantity,null)});
