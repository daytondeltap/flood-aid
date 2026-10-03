"""Refresh public sensor/place snapshots. Never fetch private app or account data."""
import json, time, urllib.request, urllib.parse, concurrent.futures
from pathlib import Path
OUT=Path('web/data');OUT.mkdir(parents=True,exist_ok=True)
UA='FloodAidBangkok/3.0 (+https://github.com/daytondeltap/flood-aid)'
AREAS=[(13.812,100.731),(13.859,100.704),(13.723,100.784),(13.855,100.862),(13.827,100.674)]
def get(url,timeout=25):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json'}),timeout=timeout) as r:return json.load(r)
def read(p):
 try:return json.loads(p.read_text())
 except:return None
def write(p,data):p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
def places(i,coords):
 lat,lng=coords;p=OUT/f'places-{i}.json';previous=read(p)
 if previous and previous.get('rows') and time.time()*1000-previous.get('retrievedAt',0)<21600000:return f'places-{i}: retained six-hour cache'
 q=f'[out:json][timeout:18];(nwr(around:5000,{lat},{lng})[shop~"^(supermarket|convenience)$"];nwr(around:5000,{lat},{lng})[amenity~"^(hospital|pharmacy|marketplace)$"];);out center tags;'
 try:
  d=get('https://maps.mail.ru/osm/tools/overpass/api/interpreter?data='+urllib.parse.quote(q));rows=[]
  for e in d['elements']:
   t=e.get('tags',{});lat=e.get('lat',e.get('center',{}).get('lat'));lng=e.get('lon',e.get('center',{}).get('lon'))
   if not isinstance(lat,(int,float)) or not isinstance(lng,(int,float)):continue
   rows.append({'id':f"{e['type']}-{e['id']}",'osmId':e['id'],'type':e['type'],'en':t.get('name:en') or t.get('name') or t.get('brand') or 'Unnamed place','th':t.get('name:th') or t.get('name'),'lat':lat,'lng':lng,'kind':t.get('amenity') if t.get('amenity') in ['hospital','pharmacy'] else 'store','hours':t.get('opening_hours'),'phone':t.get('phone') or t.get('contact:phone')})
  write(p,{'rows':rows,'retrievedAt':int(time.time()*1000),'source':'OpenStreetMap via VK Maps public Overpass'});return f'places-{i}: {len(rows)} entries'
 except Exception as e:
  if not previous:write(p,{'rows':[],'retrievedAt':None,'error':'Place directory unavailable'})
  return f'places-{i}: unavailable; retained previous snapshot'
def flood():
 from datetime import datetime,timezone,timedelta
 p=OUT/'flood.json';previous=read(p) or {};rows=[]
 try:
  d=get('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/flood_road')
  for r in d['data']:
   s=r.get('station',{})
   try:
    lat=float(s['floodroad_lat']);lng=float(s['floodroad_long']);depth=float(r['floodroad_value']);at=int(datetime.fromisoformat(r['floodroad_datetime']).replace(tzinfo=timezone(timedelta(hours=7))).timestamp()*1000)
    if not(13.3<=lat<=14.3 and 100.1<=lng<=101.3 and 0<=depth<=500):continue
    rows.append({'id':str(s.get('floodroad_oldcode') or s['id']),'name':s.get('floodroad_name',{}).get('th',str(s['id'])),'lat':lat,'lng':lng,'depth':depth,'observedAt':at,'district':r.get('geocode',{}).get('amphoe_name',{}).get('th',''),'source':'BMA via ThaiWater','url':'https://www.thaiwater.net/'})
   except (ValueError,KeyError,TypeError):continue
  if not rows:raise ValueError('No valid readings')
  history={(r['id'],r['observedAt']):r for r in previous.get('history',[])+previous.get('rows',[])+rows if r['observedAt']>=time.time()*1000-30*24*3600000}
  write(p,{'rows':rows,'history':list(history.values()),'retrievedAt':int(time.time()*1000),'sourceUrl':'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/flood_road'});return f'flood: {len(rows)} readings'
 except Exception:
  if not previous:write(p,{'rows':[],'history':[],'retrievedAt':None,'error':'Flood source unavailable'})
  return 'flood: unavailable; retained previous snapshot'
if __name__=='__main__':
 # Only public measurements and place listings. Provider failure never invents data.
 print(flood(),flush=True)
 for i,coords in enumerate(AREAS):print(places(i,coords),flush=True)
