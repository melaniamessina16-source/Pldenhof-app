"""Helper for hand-written curation: build curation entries from text-hash groups.
Usage in a script:
    from mk_entries import Maker
    m = Maker('Wüsthof', 'wusthof')            # brand name exactly as on the website; brandID = slug you choose; reads pans_pages.json + pages_big.json
    m.add(hashes, typeIDs, suitedFor, bullets, requires=[], colours=[], mismatches=[], warn=False, brandName=None)
    m.save('data/curation-pans/knives-wusthof.json')
The match list is generated from the exact page names that have those text hashes; `keys` = the hashes."""
import json, re, hashlib, sys, os
def _norm(s): return re.sub(r'\d+([,.]\d+)?', '#', s)
def _hash(i):
    paras = [d['text'] for d in i['description'][1:]]
    kl = {s['label']: s['value'] for s in i['specs']}.get('Kleur'); first = paras[0] if paras else ''
    if kl: first = re.sub(re.escape(kl), '', first, flags=re.I)
    return hashlib.sha1((_norm(first) + '||' + _norm(' || '.join(paras[1:]))).encode('utf-8')).hexdigest()[:8]
def load_pages():
    out = []
    for f in ('data/pans_pages.json', 'data/pages_big.json'):
        if os.path.exists(f): out += json.load(open(f, encoding='utf-8'))
    seen, res = set(), []
    for i in out:
        if i['url'] not in seen: seen.add(i['url']); res.append(i)
    return res
class Maker:
    def __init__(self, brand, brandID, records=None):
        self.brand, self.bid, self.out = brand, brandID, []
        pages = json.load(open(records, encoding='utf-8')) if records else load_pages()
        self.pages = [i for i in pages if (i['brand'] or '(geen merk)') == brand]
        self.by = {}
        for i in self.pages: self.by.setdefault(_hash(i), []).append(i['name'])
    def add(self, hashes, types, suited, bullets, requires=(), colours=None, mismatches=None, warn=False, brandName=None):
        names = [n for h in hashes for n in self.by[h]]
        e = {'match': [re.escape(n) for n in names], 'brandID': self.bid, 'typeIDs': types, 'suitedFor': suited,
             'bullets': bullets, 'keys': list(hashes)}
        if brandName: e['brandName'] = brandName
        if requires: e['requires'] = list(requires)
        if colours: e['colours'] = colours
        if mismatches: e['mismatches'] = mismatches
        if warn: e['inductionWarning'] = True
        self.out.append(e)
    def save(self, path): json.dump(self.out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
