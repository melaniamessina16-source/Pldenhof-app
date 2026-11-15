#!/usr/bin/env python3
"""Flag bullets that contain a number which is not on every page of the product (name, text or specs).  Output JSON like bullet_check."""
import json, re, sys
pages = {p['url']: p for f in ('data/pans_pages.json', 'data/pages_big.json') for p in json.load(open(f))}
cat = json.load(open('data/catalog.json')); out = []
N = lambda s: set(x.replace('.', ',') for x in re.findall(r'\d+(?:[.,]\d+)?', s))
for p in cat['products']:
    if p.get('autoText'): continue
    srcs = []
    for v in p['variants']:
        pg = pages.get(v['productURL'])
        if pg: srcs.append(N(pg['name'] + ' ' + ' '.join(d['text'] for d in pg['description']) + ' ' + ' '.join(f"{s['label']} {s['value']}" for s in pg['specs'])))
    if not srcs: continue
    for b in p['tellTheCustomer'] + ([p['suitedFor']['text']] if p.get('suitedFor') else []):
        nb = N(b); bad = sorted(x for x in nb if any(x not in s for s in srcs))
        if bad: out.append({'id': p['id'], 'kind': 'number', 'ratio': 0, 'bullet': b, 'url': p['source']['url'], 'pages': len(srcs), 'badnumbers': bad})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1); print(len(out), 'flagged', file=sys.stderr)
