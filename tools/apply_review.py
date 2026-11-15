#!/usr/bin/env python3
"""Apply reviewer decisions to curation files.  python3 -I tools/apply_review.py decisions.json [more.json ...]
decision: {"bullet": exact existing text, "action": "keep"|"drop"|"replace", "new": "text when replace", "only_ids": [product ids]}
Without only_ids the text is changed in every entry that carries it. With only_ids the pages of those products are first split
out of their entry into an entry of their own (so other products keep the bullet), then the change is applied there."""
import json, sys, glob, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mk_entries import _hash, load_pages
decs = [d for f in sys.argv[1:] for d in json.load(open(f))]
files = {f: json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob('data/curation-pans/*.json')) if not os.path.basename(f).startswith('_')}
cat = json.load(open('data/catalog.json')); pages = {p['url']: p for p in load_pages()}
prod = {p['id']: p for p in cat['products']}
def names_of(pid): return [pages[v['productURL']]['name'] for v in prod[pid]['variants'] if v['productURL'] in pages]
n = {'drop': 0, 'replace': 0, 'split': 0}; handled = set()
for d in decs:
    if d['action'] not in ('drop', 'replace') or not d.get('only_ids'): continue
    for pid in d['only_ids']:
        names = set(names_of(pid))
        for f, data in files.items():
            for e in list(data):
                if d['bullet'] not in e['bullets'] and e.get('suitedFor') != d['bullet']: continue
                hit = [m for m in e['match'] if any(re.fullmatch(m, x) for x in names)]
                if not hit: continue
                allnames = {p['name'] for p in pages.values() if any(re.fullmatch(m, p['name']) for m in e['match'])}
                if len(hit) < len(e['match']):
                    e['match'] = [m for m in e['match'] if m not in hit]
                    ne = json.loads(json.dumps(e)); ne['match'] = hit
                    ne['keys'] = sorted({_hash(p) for p in pages.values() if p['name'] in names})
                    ne['_only'] = d['bullet']; data.append(ne); n['split'] += 1
                else: e['_only'] = d['bullet']
dec = {d['bullet']: d for d in decs if d['action'] in ('drop', 'replace')}
for f, data in files.items():
    for e in data:
        only = e.pop('_only', None)
        nb = []
        for b in e['bullets']:
            d = dec.get(b)
            if d and (not d.get('only_ids') or only == b):
                handled.add(b); n[d['action']] += 1
                if d['action'] == 'replace': nb.append(d['new'])
            else: nb.append(b)
        e['bullets'] = nb
        d = dec.get(e.get('suitedFor'))
        if d and (not d.get('only_ids') or only == e.get('suitedFor')):
            handled.add(e['suitedFor']); n[d['action']] += 1
            e['suitedFor'] = d['new'] if d['action'] == 'replace' else None
    json.dump(data, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(n, 'not found:', len(set(dec) - handled))
for m in list(set(dec) - handled)[:5]: print('  ', m[:100])
