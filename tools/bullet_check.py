#!/usr/bin/env python3
"""Flag bullets whose words are not found in the website text of every page of the product.
python3 -I tools/bullet_check.py [threshold=0.6] > flagged.json    (reads data/catalog.json, pages_big.json, pans_pages.json)"""
import json, re, sys
th = float(sys.argv[1]) if len(sys.argv) > 1 else 0.6
W = lambda s: set(re.findall(r'[a-zà-ÿ0-9]{4,}', s.lower()))
pages = {p['url']: p for f in ('data/pans_pages.json', 'data/pages_big.json') for p in json.load(open(f))}
cat = json.load(open('data/catalog.json')); out = []
for p in cat['products']:
    if p.get('autoText'): continue
    srcs = []
    for v in p['variants']:
        pg = pages.get(v['productURL'])
        if pg: srcs.append(W(pg['name'] + ' ' + ' '.join(d['text'] for d in pg['description']) + ' ' + ' '.join(f"{s['label']} {s['value']}" for s in pg['specs'])))
    if not srcs: continue
    texts = [(b, 'bullet') for b in p['tellTheCustomer']] + ([(p['suitedFor']['text'], 'suitedFor')] if p.get('suitedFor') else [])
    for b, kind in texts:
        w = W(b)
        if not w: continue
        r = min(1 - len([x for x in w if x not in s]) / len(w) for s in srcs)
        if r < th: out.append({'id': p['id'], 'kind': kind, 'ratio': round(r, 2), 'bullet': b, 'url': p['source']['url'], 'pages': len(srcs)})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
print(f'{len(out)} flagged', file=sys.stderr)
