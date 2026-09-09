import json,re,math
from pathlib import Path
v=json.loads(Path('apps/studio/cat-studies/masters.json').read_text())[0]
body='M 65 109 C 84 80 109 63 150 63 C 191 63 216 80 235 109 C 251 129 257 150 255 173 C 252 222 211 249 150 249 C 89 249 48 222 45 173 C 43 150 49 129 65 109 Z'
def sample(path):
 ts=re.findall('[MCZ]|-?\\d+(?:\\.\\d+)?',path); pts=[];i=0;cur=None
 while i<len(ts):
  c=ts[i];i+=1
  if c=='M':cur=(float(ts[i]),float(ts[i+1]));pts.append(cur);i+=2
  elif c=='C':
   nums=list(map(float,ts[i:i+6]));i+=6;p1=nums[:2];p2=nums[2:4];p3=nums[4:];p0=cur
   for j in range(1,121):
    t=j/120;u=1-t;pts.append(tuple(u**3*p0[k]+3*u*u*t*p1[k]+3*u*t*t*p2[k]+t**3*p3[k] for k in [0,1]))
   cur=p3
  else:break
 pts=[((x-150)/100,(y-160)/100)for x,y in pts];rs=[]
 for j in range(64):
  dx,dy=math.cos(j*math.tau/64),math.sin(j*math.tau/64);hits=[]
  for a,b in zip(pts,pts[1:]+pts[:1]):
   ex,ey=b[0]-a[0],b[1]-a[1];det=dx*ey-dy*ex
   if abs(det)<1e-10:continue
   r=(a[0]*ey-a[1]*ex)/det;s=(a[0]*dy-a[1]*dx)/det
   if r>0 and 0<=s<=1:hits.append(r)
  rs.append(round(max(hits),7))
 return rs
r=sample(v['paths'][0]);b=sample(body)
Path('packages/grove/src/rigs/cat-head/soft-master.ts').write_text('// Derived from the user-selected A soft-tuft SVG master, centered at (150,160).\nexport const softMaster='+json.dumps(r)+';\nexport const softQuarter='+json.dumps(sample(v['paths'][1]))+';\nexport const softSide='+json.dumps(sample(v['paths'][2]))+';\nexport const softBody='+json.dumps(b)+';\nimport { buildEarProfile } from "./ear-profile.js";\nexport const masterProfile=(earLength=45,cheek=0)=>buildEarProfile(softMaster,softBody,earLength,cheek);\n')
Path('packages/grove/soft-tuft-master.svg').write_text(Path('apps/studio/cat-studies/a-front.svg').read_text())
