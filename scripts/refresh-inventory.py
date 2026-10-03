"""Route approved retailer JSON feeds into a public, credential-free snapshot."""
import json, os, time, math, urllib.request, urllib.parse
from pathlib import Path
OUT = Path('web/data/inventory.json')
PROVIDERS = [('7-eleven', '7-Eleven'), ('makro', 'Makro'), ('bigc', 'Big C'), ('restaurants', 'Restaurant chains')]
def normalize(row, provider, now):
 if not isinstance(row, dict): return None
 lat, lng = row.get('lat'), row.get('lng')
 if any(isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in [lat, lng]): return None
 if not (13.3 <= lat <= 14.3 and 100.1 <= lng <= 101.3): return None
 at = row.get('observedAt')
 if isinstance(at, bool) or not isinstance(at, (int, float)) or not math.isfinite(at) or not 0 < at <= now + 60000: return None
 quantity = row.get('quantity')
 if quantity is not None and (isinstance(quantity, bool) or not isinstance(quantity, (int,float)) or not math.isfinite(quantity) or quantity < 0): return None
 status = row.get('status', 'unknown')
 if status not in ['available', 'limited', 'unavailable', 'unknown']: return None
 if quantity is not None: status = 'unavailable' if quantity == 0 else ('limited' if status == 'limited' else 'available')
 def text(k): return str(row.get(k, '')).strip()[:160]
 if not all(text(k) for k in ['branchId', 'branchName', 'productId', 'productName']): return None
 url = row.get('url', '')
 parsed = urllib.parse.urlsplit(url) if isinstance(url,str) else None
 url = url if parsed and parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.query and not parsed.fragment else ''
 return {k: text(k) for k in ['branchId','branchName','productId','productName','unit']} | {'provider':provider,'lat':lat,'lng':lng,'observedAt':at,'quantity':quantity,'status':status,'url':url}
def refresh():
 now = int(time.time()*1000)
 try: config = json.loads((os.environ.get('INVENTORY_PROVIDERS_JSON') or '{}'))
 except ValueError: raise SystemExit('Inventory provider configuration must be valid JSON')
 if not isinstance(config,dict): raise SystemExit('Inventory provider configuration must be an object')
 try: previous = json.loads(OUT.read_text())
 except (OSError,ValueError): previous = {}
 rows, providers = [], []
 for key, label in PROVIDERS:
  setting = config.get(key)
  state = 'not_connected'
  if setting:
   try:
    url = setting['url']; parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username: raise ValueError()
    headers = {'Accept':'application/json','User-Agent':'FloodAidBangkok/3.1'}
    if setting.get('bearerToken'): headers['Authorization'] = 'Bearer ' + setting['bearerToken']
    # Never forward credentials across redirects.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
     def redirect_request(self, *args, **kwargs): return None
    with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers=headers),timeout=20) as response:
     body = response.read(5*1024*1024+1)
     if len(body)>5*1024*1024: raise ValueError()
     payload = json.loads(body)
    if not isinstance(payload,dict) or not isinstance(payload.get('rows'),list): raise ValueError()
    valid = [r for raw in payload['rows'][:20000] if (r:=normalize(raw,key,now))]
    if payload['rows'] and not valid: raise ValueError()
    rows.extend(valid); state = 'connected'
   except Exception:
    state = 'unavailable'
    rows.extend(r for raw in previous.get('rows',[]) if raw.get('provider')==key and (r:=normalize(raw,key,now)))
  providers.append({'id':key,'name':label,'state':state})
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({'rows':rows,'providers':providers,'retrievedAt':now},ensure_ascii=False))
 print('Inventory refresh: '+', '.join(p['name']+': '+p['state'] for p in providers))
if __name__=='__main__': refresh()
