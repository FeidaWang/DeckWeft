"""Independent PDF check for S7 exports: text per page, tagging, language, title and figure alternative text.

Uses pypdf when it is installed (it is optional and never a runtime dependency). Without it the script writes
{"available": false} so the export report can say the check did not run.

    python3 tests/inspect_pdf.py deck.pdf --out report.json [--split DIR]

Run it on PDFs this repository printed (pypdf usually lives in the user site, which -I hides).
"""
import argparse, json, os

ap = argparse.ArgumentParser()
ap.add_argument('pdf'); ap.add_argument('--out', required=True); ap.add_argument('--split')
args = ap.parse_args()
try:
    import pypdf
except ImportError:
    open(args.out, 'w').write(json.dumps({'available': False, 'reason': 'pypdf is not installed'}) + '\n')
    print('pypdf unavailable'); raise SystemExit(0)

reader = pypdf.PdfReader(args.pdf)
root = reader.trailer['/Root']
figures = []
pages = {page.indirect_reference.idnum: i for i, page in enumerate(reader.pages)}


def walk(node, page=None, depth=0):
    """Collects /Figure elements: their /Alt, page and whether tagged structure sits inside (a grouping figure whose content is
    itself tagged, such as an image figure or a list of bars with real text). Returns whether this node holds tagged structure."""
    if depth > 200:
        return False
    node = node.get_object() if hasattr(node, 'get_object') else node
    if isinstance(node, pypdf.generic.ArrayObject):
        return any([walk(k, page, depth + 1) for k in node])
    if not isinstance(node, pypdf.generic.DictionaryObject):
        return False
    if '/Pg' in node:
        page = pages.get(node.raw_get('/Pg').idnum, page)
    inner = walk(node['/K'], page, depth + 1) if '/K' in node else False
    if node.get('/S') == '/Figure':
        figures.append({'alt': str(node.get('/Alt', '') or '').strip(), 'page': page, 'grouping': inner})
    return '/S' in node and node.get('/S') not in ('/NonStruct',) or inner


tree = root.get('/StructTreeRoot')
if tree is not None:
    walk(tree.get_object().get('/K', pypdf.generic.ArrayObject()))
meta = reader.metadata or {}
report = {'available': True, 'pypdf': pypdf.__version__, 'pageCount': len(reader.pages),
          'pages': [{'text': page.extract_text() or '', 'width': float(page.mediabox.width), 'height': float(page.mediabox.height)} for page in reader.pages],
          'tagged': tree is not None, 'figureList': figures, 'marked': bool(root.get('/MarkInfo', {}).get('/Marked', False)) if root.get('/MarkInfo') else False,
          'lang': str(root.get('/Lang', '')) or None, 'title': str(meta.get('/Title', '') or '') or None, 'figures': sum(1 for f in figures if not f['grouping']), 'figuresWithAlt': sum(1 for f in figures if not f['grouping'] and f['alt']), 'groupingFigures': sum(1 for f in figures if f['grouping']), 'groupingFiguresWithoutAlt': sum(1 for f in figures if f['grouping'] and not f['alt']),
          'outline': len(reader.outline) if reader.outline else 0}
if args.split:
    os.makedirs(args.split, exist_ok=True)
    for i, page in enumerate(reader.pages):
        w = pypdf.PdfWriter(); w.add_page(page)
        with open(os.path.join(args.split, 'page-%02d.pdf' % (i + 1)), 'wb') as f:
            w.write(f)
open(args.out, 'w').write(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({k: report[k] for k in ('pageCount', 'tagged', 'marked', 'lang', 'title', 'figures', 'figuresWithAlt')}, ensure_ascii=False))
