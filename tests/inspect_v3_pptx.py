"""Independent standard-library check of a v3 PowerPoint package (S7, VIS-016).

Reads the ZIP and XML with Python's own parsers, not DeckWeft's: CRC, every XML part, content types, relationship targets,
the embedded chart workbooks against the chart caches, pictures against the slide area, and the expected text per slide.
It does not open PowerPoint or Keynote and does not claim application acceptance.

    python3 -I tests/inspect_v3_pptx.py deck.pptx --expect expected.json --out report.json
"""
import argparse, io, json, posixpath, re, zipfile
import xml.etree.ElementTree as ET

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'rel': 'http://schemas.openxmlformats.org/package/2006/relationships', 'ct': 'http://schemas.openxmlformats.org/package/2006/content-types',
      's': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
R_ID = '{%s}id' % NS['r']
norm = lambda s: re.sub(r'\s+', '', s or '')


def rels_of(package, part):
    name = posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part) + '.rels')
    if name not in package.namelist():
        return {}
    out = {}
    for rel in ET.fromstring(package.read(name)):
        target = rel.get('Target') if rel.get('TargetMode') == 'External' else posixpath.normpath(posixpath.join(posixpath.dirname(part), rel.get('Target')))
        out[rel.get('Id')] = (rel.get('Type').rsplit('/', 1)[-1], target, rel.get('TargetMode') == 'External')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pptx'); ap.add_argument('--expect'); ap.add_argument('--out', required=True)
    args = ap.parse_args()
    failures, slides = [], []
    with zipfile.ZipFile(args.pptx) as package:
        if package.testzip() is not None:
            failures.append('CRC')
        names = set(package.namelist())
        types = ET.fromstring(package.read('[Content_Types].xml'))
        defaults = {d.get('Extension') for d in types.findall('ct:Default', NS)}
        overrides = {o.get('PartName')[1:] for o in types.findall('ct:Override', NS)}
        for name in names:
            if name.startswith('/') or '..' in name.split('/'):
                failures.append('unsafe path ' + name)
            if name.endswith(('.xml', '.rels')):
                ET.fromstring(package.read(name))
            if name not in overrides and name.rsplit('.', 1)[-1] not in defaults:
                failures.append('no content type ' + name)
            if name.endswith('.rels'):
                owner = posixpath.dirname(posixpath.dirname(name))
                for rel in ET.fromstring(package.read(name)):
                    if rel.get('TargetMode') == 'External':
                        continue
                    target = posixpath.normpath(posixpath.join(owner, rel.get('Target')))
                    if target not in names:
                        failures.append('missing target %s -> %s' % (name, target))
        pres = ET.fromstring(package.read('ppt/presentation.xml'))
        size = pres.find('p:sldSz', NS)
        area = int(size.get('cx')) * int(size.get('cy'))
        prel = rels_of(package, 'ppt/presentation.xml')
        order = [prel[s.get(R_ID)][1] for s in pres.find('p:sldIdLst', NS)]
        charts_checked = 0
        for name in order:
            xml = ET.fromstring(package.read(name)); rel = rels_of(package, name)
            tree = xml.find('.//p:spTree', NS)
            texts = [''.join(t.text or '' for t in sp.iter('{%s}t' % NS['a'])) for sp in tree if sp.tag.endswith('}sp')]
            descr = [c.get('descr') or '' for c in xml.iter('{%s}cNvPr' % NS['p'])]
            pics = [p for p in tree if p.tag.endswith('}pic')]
            for p in pics:
                ext = p.find('.//a:xfrm/a:ext', NS)
                if ext is not None and int(ext.get('cx')) * int(ext.get('cy')) >= 0.9 * area and not p.find('.//p:cNvPr', NS).get('name', '').endswith('/image'):
                    failures.append('whole-slide picture on ' + name)
            chart_text = []
            for frame in tree.iter('{%s}chart' % NS['c']):
                part = rel[frame.get(R_ID)][1]; chart = ET.fromstring(package.read(part)); crel = rels_of(package, part)
                caches = [v.text for v in chart.iter('{%s}v' % NS['c'])]
                chart_text += caches
                ext = chart.find('c:externalData', NS)
                book = crel.get(ext.get(R_ID)) if ext is not None else None
                if not book or book[1] not in names:
                    failures.append('no embedded workbook for ' + part); continue
                with zipfile.ZipFile(io.BytesIO(package.read(book[1]))) as wb:
                    sheet = ET.fromstring(wb.read('xl/worksheets/sheet1.xml'))
                    cells = {c.get('r'): (c.findtext('s:v', default='', namespaces=NS) or ''.join(t.text or '' for t in c.iter('{%s}t' % NS['s']))) for c in sheet.iter('{%s}c' % NS['s'])}
                for ser in chart.iter('{%s}ser' % NS['c']):
                    for ref_el, cache_tag in (('c:val', 'numCache'), ('c:yVal', 'numCache'), ('c:cat', 'strCache'), ('c:xVal', 'numCache')):
                        el = ser.find(ref_el, NS)
                        if el is None:
                            continue
                        f = el.find('.//c:f', NS).text; col, first, last = re.match(r"Sheet1!\$([A-Z]+)\$(\d+):\$[A-Z]+\$(\d+)", f).groups()
                        for pt in el.iter('{%s}pt' % NS['c']):
                            ref = '%s%d' % (col, int(first) + int(pt.get('idx')))
                            cached, stored = pt.findtext('c:v', namespaces=NS), cells.get(ref)
                            if stored is None or (cached != stored and not (re.match(r'^-?[\d.e+-]+$', cached or '') and float(cached) == float(stored or 'nan'))):
                                failures.append('workbook %s %s differs from the cache' % (book[1], ref))
                charts_checked += 1
            notes_target = next((v[1] for v in rel.values() if v[0] == 'notesSlide'), None)
            notes = ''.join(t.text or '' for t in ET.fromstring(package.read(notes_target)).iter('{%s}t' % NS['a'])) if notes_target else ''
            tables = [''.join(t.text or '' for t in tc.iter('{%s}t' % NS['a'])) for tc in tree.iter('{%s}tc' % NS['a'])]
            slides.append({'slide': name, 'textShapes': sum(1 for t in texts if t.strip()), 'pictures': len(pics), 'charts': len(list(tree.iter('{%s}chart' % NS['c']))),
                           'tables': len(list(tree.iter('{%s}tbl' % NS['a']))), 'connectors': sum(1 for sp in tree if sp.tag.endswith('}cxnSp')),
                           'timing': xml.find('p:timing', NS) is not None, 'transition': xml.find('p:transition', NS) is not None,
                           'pool': norm(' '.join(texts + tables + descr + chart_text) + notes)})
        missing = []
        if args.expect:
            expected = json.load(open(args.expect))
            if len(expected) != len(slides):
                failures.append('slide count %d vs %d scenes' % (len(slides), len(expected)))
            for e, s in zip(expected, slides):
                lost = [t for t in e['strings'] if norm(t) not in s['pool']]
                if lost:
                    missing.append({'sceneId': e['sceneId'], 'missing': lost[:10]})
        for s in slides:
            if s['timing'] or s['transition']:
                failures.append('timing or transition on ' + s['slide'])
            del s['pool']
    report = {'kind': 'independent PPTX ZIP/XML/relationship/workbook/text check (Python standard library); not PowerPoint or Keynote acceptance',
              'status': 'pass' if not failures and not missing else 'fail', 'failures': failures, 'missingText': missing, 'chartsChecked': charts_checked, 'slides': slides}
    open(args.out, 'w').write(json.dumps(report, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps({k: report[k] for k in ('status', 'chartsChecked')} | {'failures': len(failures), 'missingText': len(missing)}))


main()
