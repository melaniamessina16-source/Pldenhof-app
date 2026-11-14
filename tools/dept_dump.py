#!/usr/bin/env python3
"""Show what is left to write for a department, from the website texts in data/pages_big.json + pans_pages.json.
  python3 -I tools/dept_dump.py DEPT                      -> brands with number of unclaimed pages/distinct texts
  python3 -I tools/dept_dump.py DEPT BRAND [rest] [first]  -> text groups of that brand (hash, page names, first paragraph, rest)
DEPT = pannen | messen | klein-elektrisch | bbq | koffie-accessoires (the lists in batches/web-*.txt).
A page counts as claimed when a curation file (data/curation-pans/*.json, not starting with _) already matches it
or it is already in data/catalog.json. _excluded.json counts as handled too. Other agents' files are respected."""
import json, re, sys, glob, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mk_entries import _hash, _norm, load_pages
B = '/mnt/project-files/oldenhof-app/batches/'
dept = {}
for f in glob.glob(B + 'web-*-van-*.txt'):
    d = re.match(r'.*/web-(.*)-\d-van-\d\.txt', f).group(1)
    for l in open(f):
        if l.startswith('http'): dept[l.strip()] = d
D = sys.argv[1]
pages = [p for p in load_pages() if dept.get(p['url']) == D]
claimed = []
for f in glob.glob('data/curation-pans/*.json'):
    if os.path.basename(f) == '_auto.json': continue
    for e in json.load(open(f, encoding='utf-8')):
        claimed += e['match'] if isinstance(e['match'], list) else [e['match']]
rx = [re.compile(m) for m in claimed]
cat = json.load(open('data/catalog.json')); have = {v['productURL'] for p in cat['products'] for v in p['variants']}
left = [p for p in pages if p['url'] not in have and not any(r.fullmatch(p['name']) for r in rx)]
if len(sys.argv) == 2:
    c = collections.defaultdict(lambda: [0, set()])
    for p in left: c[p['brand'] or '(geen merk)'][0] += 1; c[p['brand'] or '(geen merk)'][1].add(_hash(p))
    print(f'{D}: {len(pages)} pages in the list, {len(left)} not yet claimed')
    for b, (n, h) in sorted(c.items(), key=lambda x: -x[1][0]): print(f'{b}\t{n} pages\t{len(h)} distinct texts')
    sys.exit()
brand = sys.argv[2]; rl = int(sys.argv[3]) if len(sys.argv) > 3 else 1400; fl = int(sys.argv[4]) if len(sys.argv) > 4 else 500
g = collections.OrderedDict()
for p in left:
    if (p['brand'] or '(geen merk)') != brand: continue
    g.setdefault(_hash(p), []).append(p)
seen = {}
for n, (h, v) in enumerate(g.items(), 1):
    p = v[0]; paras = [d['text'] for d in p['description'][1:]]
    print(f'=== [{h}] {len(v)} pagina\'s')
    for i in v[:10]: print('  -', i['name'])
    if len(v) > 10: print(f'  … +{len(v)-10}')
    sp = '; '.join(f"{s['label']}: {s['value']}" for s in p['specs'] if s['label'] not in ('Merk', 'Artikelnummer', 'EAN'))
    print('  SPECS:', sp[:500])
    print('  EERSTE ALINEA (cijfers=#):', _norm(paras[0] if paras else '')[:fl])
    rest = ' || '.join(paras[1:]); k = _norm(rest)
    if k in seen: print(f'  REST: (zelfde als [{seen[k]}])')
    else: seen[k] = h; print('  REST:', rest[:rl])
