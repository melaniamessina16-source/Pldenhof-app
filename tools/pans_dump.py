#!/usr/bin/env python3
"""Print description groups of imported pan pages so curation can be written from the website text.
Usage: python3 -I tools/pans_dump.py RECORDS.json BRAND [maxchars]"""
import json, re, sys, collections, hashlib
recs = json.load(open(sys.argv[1], encoding='utf-8'))
brand = sys.argv[2]; mx = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
norm = lambda s: re.sub(r'\d+([,.]\d+)?', '#', s)
g = collections.OrderedDict()
for i in recs:
    if (i['brand'] or '(geen merk)') != brand: continue
    paras = [d['text'] for d in i['description'][1:]]
    kl = {s['label']: s['value'] for s in i['specs']}.get('Kleur')
    first = paras[0] if paras else ''
    if kl: first = re.sub(re.escape(kl), '', first, flags=re.I)
    h = hashlib.sha1((norm(first) + '||' + norm(' || '.join(paras[1:]))).encode('utf-8')).hexdigest()[:8]
    key = (norm(paras[0]) if paras else '', ' || '.join(paras[1:]), h)
    g.setdefault(key, []).append(i)
for n, (k, v) in enumerate(g.items(), 1):
    print(f'=== GROEP {n} [{k[2]}]: {len(v)} pagina\'s')
    for i in v[:12]: print('  -', i['name'])
    if len(v) > 12: print(f'  … +{len(v)-12}')
    print('  EERSTE ALINEA (cijfers=#):', k[0][:500])
    print('  REST:', k[1][:mx])
