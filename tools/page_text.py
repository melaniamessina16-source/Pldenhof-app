#!/usr/bin/env python3
"""Print the website text + specs of every page behind a product id (from data/catalog.json).  python3 -I tools/page_text.py PRODUCT_ID"""
import json, sys
pages = {p['url']: p for f in ('data/pans_pages.json', 'data/pages_big.json') for p in json.load(open(f))}
cat = json.load(open('data/catalog.json'))
p = next(x for x in cat['products'] if x['id'] == sys.argv[1])
print('PRODUCT:', p['name']); print('BULLETS:'); [print('  -', b) for b in p['tellTheCustomer']]
if p.get('suitedFor'): print('SUITEDFOR:', p['suitedFor']['text'])
for v in p['variants']:
    pg = pages.get(v['productURL'])
    if not pg: continue
    print('\n=== PAGE:', pg['name']); print('\n'.join(d['text'] for d in pg['description'][1:])); print('SPECS:', '; '.join(f"{s['label']}: {s['value']}" for s in pg['specs']))
