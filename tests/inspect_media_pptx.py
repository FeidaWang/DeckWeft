"""Independent standard-library package check; does not claim Office application acceptance."""
import argparse, hashlib, json, posixpath, re, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
parser=argparse.ArgumentParser();parser.add_argument('pptx');parser.add_argument('--project',required=True);parser.add_argument('--out',required=True);args=parser.parse_args()
project=json.loads(Path(args.project).read_text());ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
normalize=lambda s:re.sub(r'\s+','',s)
with zipfile.ZipFile(args.pptx) as package:
 assert package.testzip() is None
 names=set(package.namelist());slides=sorted((n for n in names if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'(\d+)\.xml',n)[1]));assert len(slides)==len(project['slides'])
 for name in names:
  assert not name.startswith('/') and '..' not in name.split('/')
  if name.endswith(('.xml','.rels')):ET.fromstring(package.read(name))
  if name.endswith('.rels'):
   owner=posixpath.dirname(posixpath.dirname(name))
   for rel in ET.fromstring(package.read(name)):
    if rel.get('TargetMode')=='External':continue
    target=posixpath.normpath(posixpath.join(owner,rel.get('Target')));assert target in names,(name,target)
 counts=[]
 for name,slide in zip(slides,project['slides']):
  xml=ET.fromstring(package.read(name));texts=[n.text or '' for n in xml.findall('.//a:t',ns)];joined=normalize(''.join(texts))
  expected=[slide['content']['title'],slide['content']['body'],*slide['content']['items']]
  for text in expected:assert normalize(text) in joined,(name,text)
  assert not slide['notes'] or slide['notes'] not in ''.join(texts)
  counts.append({'slide':name,'textShapes':len([n for n in xml.findall('.//p:sp',ns) if n.find('p:txBody',ns) is not None]),'pictures':len(xml.findall('.//p:pic',ns))})
 media=[n for n in names if n.startswith('ppt/media/')];assert len(media)==1
 assert hashlib.sha256(package.read(media[0])).hexdigest()==project['assets'][0]['hash']
 report={'kind':'independent PPTX ZIP/XML/relationship/editability check, not real application acceptance','slides':counts,'totalTextShapes':sum(s['textShapes'] for s in counts),'totalPictures':sum(s['pictures'] for s in counts),'embeddedPNGHashMatchesProject':True,'CRC':'passed','allXML':'parsed','internalRelationships':'resolved','sourceTitlesBodyItems':'preserved','privateNotes':'absent from slides'}
 Path(args.out).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
