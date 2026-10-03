import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
const {window,document}=parseHTML(fs.readFileSync('web/index.html','utf8'));
Object.defineProperty(document,'baseURI',{value:'https://daytondeltap.github.io/flood-aid/'});
const storage=new Map(),requests=[];
const samples={rows:[{id:'node-8',osmId:8,type:'node',en:'Test Market',th:'ตลาดทดสอบ',lat:13.81,lng:100.73,kind:'store'}],retrievedAt:Date.now()};
const responseFor=url=>String(url).includes('/data/places-')?samples:String(url).includes('/data/flood.json')?{rows:[{id:'FL.1',name:'Test road',lat:13.811,lng:100.731,depth:12,observedAt:Date.now()}],history:[],retrievedAt:Date.now()}:String(url).includes('/api/reports')?{reports:[],signedIn:true}:String(url).includes('/api/destinations')?{destinations:[],signedIn:true}:String(url).includes('/api/route')?{routes:[{distance:2000,duration:300,coordinates:[[100.731,13.812],[100.73,13.81]]}]}:{current:{temperature_2m:29,weather_code:3,time:'2026-10-03T08:00',relative_humidity_2m:70,wind_speed_10m:5},hourly:{time:['2026-10-03T09:00'],precipitation:[2],precipitation_probability:[75]},daily:{time:['2026-10-03'],temperature_2m_min:[26],temperature_2m_max:[31],precipitation_sum:[4]}};
const dialog=document.querySelector('dialog');dialog.showModal=function(){this.open=true};dialog.close=function(){this.open=false};window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};
const fetcher=async(url,opts)=>{requests.push({url,opts});return Response.json(responseFor(url))};
class FormDataStub{constructor(form){this.items=[...form.querySelectorAll('[name]')].map(e=>[e.name||e.getAttribute('name'),e.value??''])}get(k){return this.items.find(x=>x[0]===k)?.[1]}[Symbol.iterator](){return this.items[Symbol.iterator]()}}
const sandbox={window,document,console,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},URLSearchParams,clearTimeout:()=>{},navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval:()=>0,setTimeout:()=>0,URL,Response,Request,AbortSignal,AbortController,Date,Math,JSON,Map,Set,Promise,Number,String,encodeURIComponent,fetch:fetcher,FormData:FormDataStub};
vm.createContext(sandbox);for(const file of ['config.js','core.js','app.js','upgrade.js','pages.js','google-map.js'])vm.runInContext(fs.readFileSync('web/'+file,'utf8'),sandbox,{filename:file});
const run=source=>vm.runInContext(source,sandbox);


test('Pages loads district snapshots under repository base path',async()=>{await new Promise(r=>setImmediate(r));assert.ok(requests.some(r=>String(r.url)==='https://daytondeltap.github.io/flood-aid/data/flood.json'));assert.ok(requests.some(r=>String(r.url).includes('/flood-aid/data/places-')));assert.ok(document.querySelector('#mapSettingsButton'));run("navigate('supplies')");assert.match(document.body.textContent,/Test Market/)});
test('Pages rejects shared writes without pretending to save',async()=>{await assert.rejects(run("apiJSON('/api/reports',{method:'POST'})"),/need a backend/);run('reportForm()');assert.match(dialog.textContent,/need a backend/);assert.equal(document.querySelector('#reportForm'),null)});
test('Google key entry is optional and default configuration contains no key',()=>{assert.equal(window.FLOODAID_CONFIG.googleMapsBrowserKey,'');run('mapSettings()');assert.ok(document.querySelector('#mapsKey'));assert.equal(document.querySelector('#mapsKey').type,'password');assert.match(dialog.textContent,/Maps JavaScript API/);assert.equal(window.GMAPReady,false)});
