from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json,posixpath,hashlib
p=Path('dist/mb-06-10/demo/final-measured.pptx')
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
with ZipFile(p) as z:
 assert z.testzip() is None
 parts=set(z.namelist());texts=[];records=[]
 for name in sorted(parts):
  if name.endswith(('.xml','.rels')):
   root=ET.fromstring(z.read(name))
   if name.endswith('.rels'):
    base=posixpath.dirname(posixpath.dirname(name))
    for rel in root:
     if rel.attrib.get('TargetMode')!='External':assert posixpath.normpath(posixpath.join(base,rel.attrib['Target'])) in parts
   if name.startswith('ppt/slides/slide') and name.endswith('.xml'):
    text=[n.text or '' for n in root.findall('.//a:t',ns)];texts+=text
    records.append({'part':name,'nativeTextShapes':sum(1 for s in root.findall('.//p:sp',ns) if s.findall('.//a:t',ns)),'pictures':len(root.findall('.//p:pic',ns)),'textRuns':len(text)})
 assert len(records)==7
 assert sum(r['pictures'] for r in records)==1
 assert 'Build your presentation offline' in texts
 assert not any(b'no independent API model attestation' in z.read(n) for n in parts if n.startswith('ppt/notesSlides/notesSlide'))
 record={'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'slides':records,'nativeTextShapes':sum(r['nativeTextShapes'] for r in records),'pictures':1,'crc':'passed','xml':'passed','relationships':'passed','privateNotesOmitted':True}
Path('docs/evidence/mb-06-10/pptx-inspection.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
