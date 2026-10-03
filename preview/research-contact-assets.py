import json, urllib.request, urllib.parse
from pathlib import Path
out=Path(__file__).parent/'contact-source'
out.mkdir(exist_ok=True)
for name in ['李斯','蒙恬','王翦','章邯','吕不韦']:
    query=urllib.parse.urlencode({'action':'query','list':'allimages','aiprefix':name,'ailimit':50,'aiprop':'url|size','format':'json'})
    req=urllib.request.Request('https://wiki.biligame.com/whrhx/api.php?'+query,headers={'User-Agent':'Mozilla/5.0'})
    try:
        data=json.load(urllib.request.urlopen(req,timeout=25))
        (out/(name+'-inventory.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
        print(name,json.dumps(data.get('query',{}).get('allimages',[]),ensure_ascii=False))
    except Exception as e: print(name,type(e).__name__,str(e))
