#!/usr/bin/env python3
"""Build data/catalog.json from the seed (booklet guides, categories, brands), the parsed website pages
and the hand-written curation layers.

Usage (from oldenhof-app/):
    python3 -I tools/parse_pages.py data/coffee_pages.json <saved coffee pages...>
    python3 -I tools/build_catalog.py

Inputs
    data/catalog_seed.json        booklet type guides, categories, brands, booklet mismatches
    data/sample_pages.json        parsed pages for the first pan products (old curation format)
    data/curation.json            curation for those pan products
    data/coffee_pages.json        parsed coffee pages
    data/curation-coffee/*.json   curation per brand (one product per model, colours as variants)
Rules
    * Only website text goes into products. Website values that are 5-digit codes are left out and flagged.
    * Variants without an EAN are flagged. Pages that are not the original Dutch page are refused.
Running it twice gives the same file.
"""
import glob, json, re, sys, unicodedata

SEED, OUT = 'data/catalog_seed.json', 'data/catalog.json'
COFFEE_TYPES = {'volautomaat', 'halfautomaat', 'filterkoffie'}
DROP_SPECS = {'Merk', 'Artikelnummer', 'EAN', 'Kleur'}
CODE = re.compile(r'^\d{5}$')
NEW_BRANDS = {'rancilio': 'Rancilio', 'solis': 'Solis', 'graef': 'Graef', 'lapiccola': 'La Piccola'}
# booklet p. 44: which brands the shop sells per machine type
BOOKLET_BRANDS = {'volautomaat': ['jura', 'nivona', 'smeg'],
                  'halfautomaat': ['ecm', 'isomac', 'lapavoni', 'profitec', 'sage', 'smeg']}
FILTER_GUIDE = {
    'id': 'filterkoffie', 'categoryID': 'koffie', 'name': 'Filterkoffie', 'subtitle': 'Koffiezetapparaat',
    'oneLiner': {'text': 'Zet koffie volgens de (snel)filtermethode in een kan.',
                 'source': {'kind': 'website', 'url': 'https://www.kookwinkel.nl/smeg-50-s-style-koffiezetapparaat-kunststof-mat-zwart-85329-0001062617'}},
    'facts': [], 'sections': [
        {'title': 'Uit het boekje', 'symbol': 'book', 'bullets': [
            'Het boekje noemt koffieapparaten voor filterkoffie als een van de soorten koffieapparaten, maar beschrijft ze verder niet.'],
         'source': {'kind': 'booklet', 'page': 44}}],
    'brandIDs': []}

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def load(p): return json.load(open(p, encoding='utf-8'))

def check_page(p):
    if p['lang'] != 'nl' or p['translatedByBrowser']:
        sys.exit(f'{p["file"]}: page is not the original Dutch page; save it again without translation')

def spec_dict(p): return {s['label']: s['value'] for s in p['specs']}

def original_text(p):
    return '\n\n'.join(d['text'] for d in p['description'][1:])  # [0] is the page title heading

def old_products(cat, checked):
    """First pan products, old curation format (variants point to a file prefix)."""
    pages, cur = load('data/sample_pages.json'), load('data/curation.json')
    def page_for(prefix):
        hits = [p for p in pages if p['file'].startswith(prefix)]
        if len(hits) != 1:
            sys.exit(f'Expected one saved page starting with {prefix!r}, found {len(hits)}')
        check_page(hits[0]); return hits[0]
    out = []
    for item in cur['products']:
        if set(item['typeIDs']) & COFFEE_TYPES:
            continue  # coffee now comes from curation-coffee
        variants, first = [], None
        for v in item['variants']:
            p = page_for(v['file']); first = first or p; spec = spec_dict(p)
            variants.append({'id': v['id'], 'colorName': v['colorName'], 'colorHex': v.get('colorHex'),
                             'ean': p['ean'] or spec.get('EAN'), 'articleNumber': spec.get('Artikelnummer'),
                             'imageName': v.get('imageName'), 'imageURL': p.get('image'), 'productURL': p['url']})
        drop = set(item.get('dropSpecs', []))
        specs = [s for s in first['specs'] if s['label'] not in drop] + item.get('extraSpecs', [])
        website = {'kind': 'website', 'url': first['url'], 'checkedOn': checked}
        out.append({'id': item['id'], 'name': item['name'], 'brandID': item['brandID'], 'typeIDs': item['typeIDs'],
                    'suitedFor': {'text': item['suitedFor'], 'source': website} if item.get('suitedFor') else None,
                    'tellTheCustomer': item['tellTheCustomer'], 'specs': specs,
                    'originalDescription': original_text(first), 'variants': variants, 'source': website,
                    'mismatchIDs': item.get('mismatchIDs') or None})
    keep = {m['id'] for m in cur['mismatches'] if not m['id'].startswith(('web-profitec-go', 'web-oraclejet'))}
    return out, [m for m in cur['mismatches'] if m['id'] in keep], cur

def coffee_products(checked):
    pages = {p['file']: p for p in load('data/sample_pages.json') + load('data/coffee_pages.json')}
    products, mismatches = [], []
    for f in sorted(glob.glob('data/curation-coffee/*.json')):
        for item in load(f):
            pid = item['id']; vpages = []
            for v in item['variants']:
                if v['file'] not in pages:
                    sys.exit(f'{pid}: saved page not parsed: {v["file"]}')
                p = pages[v['file']]; check_page(p); vpages.append(p)
            first = vpages[0]
            mids = []
            def flag(n, topic, says, note):
                mid = f'web-{pid}-{n}'
                mismatches.append({'id': mid, 'kind': 'websiteData', 'topic': topic, 'websiteSays': says,
                                   'status': 'toVerify', 'note': note, 'productIDs': [pid]})
                mids.append(mid)
            for i, m in enumerate(item.get('mismatches', []), 1):
                flag(i, m['topic'], m['websiteSays'], m['note'])
            # website values that are internal codes
            coded = {}
            for p in vpages:
                for s in p['specs']:
                    if CODE.match(s['value']) and s['label'] not in DROP_SPECS:
                        coded.setdefault(s['label'], set()).add(s['value'])
            if coded:
                flag('codes', f'{item["name"]}: specificaties tonen een code',
                     'Op de website staat een getal van 5 cijfers in plaats van een waarde bij: '
                     + '; '.join(f'{k} ({", ".join(sorted(v))})' for k, v in sorted(coded.items())) + '.',
                     'Deze regels zijn uit de app gelaten. Waar de beschrijving de waarde noemt, staat die in de app.')
            missing = [v['colorName'] for v, p in zip(item['variants'], vpages) if not (p['ean'] or spec_dict(p).get('EAN'))]
            if missing:
                flag('ean', f'{item["name"]}: EAN ontbreekt', 'Geen EAN op de website voor: ' + ', '.join(missing) + '.',
                     'Scan de barcode op de doos en zet hem in een notitie.')
            extra = {s['label']: s['value'] for s in item.get('extraSpecs', [])}
            specs = [s for s in first['specs'] if s['label'] not in DROP_SPECS and not CODE.match(s['value'])
                     and s['label'] not in extra]
            specs += [{'label': k, 'value': v} for k, v in extra.items()]
            variants = []
            for v, p in zip(item['variants'], vpages):
                sp = spec_dict(p); vid = f'{pid}-{slug(v["colorName"])}'
                variants.append({'id': vid, 'colorName': v['colorName'], 'colorHex': v.get('colorHex'),
                                 'ean': p['ean'] or sp.get('EAN'), 'articleNumber': sp.get('Artikelnummer'),
                                 'imageName': None, 'imageURL': p.get('image'), 'productURL': p['url']})
            website = {'kind': 'website', 'url': first['url'], 'checkedOn': checked}
            products.append({'id': pid, 'name': item['name'], 'brandID': item['brandID'], 'typeIDs': item['typeIDs'],
                             'suitedFor': {'text': item['suitedFor'], 'source': website} if item.get('suitedFor') else None,
                             'tellTheCustomer': item['tellTheCustomer'], 'specs': specs,
                             'originalDescription': original_text(first), 'variants': variants,
                             'source': website, 'mismatchIDs': mids or None})
    return products, mismatches

def main():
    cat = load(SEED)
    checked = '2026-11-12'
    pans, pan_mm, cur = old_products(cat, checked)
    coffee, coffee_mm = coffee_products(checked)
    products = pans + coffee
    ids = [p['id'] for p in products]
    if len(ids) != len(set(ids)):
        sys.exit('Duplicate product ids')

    names = {b['id'] for b in cat['brands']}
    cat['brands'] += [{'id': k, 'name': v} for k, v in NEW_BRANDS.items() if k not in names]
    for b in cat['brands']:
        if b['id'] in cur.get('brands', {}):
            b['officialURL'] = cur['brands'][b['id']]['officialURL']
            b['officialURLCheckedOn'] = cur['brands'][b['id']]['checkedOn']
    known = {b['id'] for b in cat['brands']}
    for p in products:
        if p['brandID'] not in known:
            sys.exit(f'Unknown brand {p["brandID"]}')

    if not any(g['id'] == 'filterkoffie' for g in cat['typeGuides']):
        cat['typeGuides'].append(FILTER_GUIDE)
    bname = {b['id']: b['name'] for b in cat['brands']}
    type_mm = []
    for g in cat['typeGuides']:
        on_site = sorted({p['brandID'] for p in products if g['id'] in p['typeIDs']}, key=lambda b: bname[b])
        if g['categoryID'] == 'koffie':
            g['brandIDs'] = on_site
        if g['id'] in BOOKLET_BRANDS:
            book = BOOKLET_BRANDS[g['id']]
            extra = [bname[b] for b in on_site if b not in book]
            gone = [bname.get(b, b) for b in book if b not in on_site]
            if extra or gone:
                says = []
                if extra: says.append('Op de website ook: ' + ', '.join(extra) + '.')
                if gone: says.append('Niet gevonden in de productlijst (sitemap) van de website: ' + ', '.join(gone) + '.')
                mid = f'brands-{g["id"]}'
                type_mm.append({'id': mid, 'kind': 'bookletVsWebsite', 'topic': f'Merken {g["name"].lower()}',
                                'bookletSays': 'Oldenhof verkoopt ' + g['name'].lower().replace('maat', 'maten') + ' van: '
                                + ', '.join(bname.get(b, b) for b in book) + '.',
                                'bookletPage': 44, 'websiteSays': ' '.join(says), 'status': 'toVerify',
                                'note': 'Indeling in de app volgt de website. Laat Oldenhof bevestigen welke merken nog verkocht worden.'})
                g['mismatchIDs'] = list(dict.fromkeys((g.get('mismatchIDs') or []) + [mid]))
        extra_ids = cur.get('typeGuideMismatches', {}).get(g['id'], [])
        if extra_ids:
            g['mismatchIDs'] = list(dict.fromkeys((g.get('mismatchIDs') or []) + extra_ids))

    # Sage Oracle Jet: the booklet-vs-website type question already exists; link it, drop the duplicate
    for p in products:
        if p['id'] == 'sage-the-oracle-jet':
            p['mismatchIDs'] = [m for m in (p['mismatchIDs'] or []) if m != 'web-sage-the-oracle-jet-1'] + ['type-oraclejet']
    coffee_mm = [m for m in coffee_mm if m['id'] != 'web-sage-the-oracle-jet-1']

    new = {m['id']: m for m in pan_mm + coffee_mm + type_mm}
    seed_mm = [m for m in cat['mismatches'] if m['id'] not in new
               and not m['id'].startswith(('web-profitec-go', 'web-oraclejet'))]
    mismatches = seed_mm + list(new.values())
    for m in mismatches:
        m.update(cur.get('mismatchUpdates', {}).get(m['id'], {}))
    all_ids = {m['id'] for m in mismatches}
    for p in products:
        for mid in p['mismatchIDs'] or []:
            if mid not in all_ids:
                sys.exit(f'{p["id"]}: unknown mismatch {mid}')
    cat.update(products=products, mismatches=mismatches, version='0.3-web', generatedOn=checked)
    json.dump(cat, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(products)} products, {sum(len(p["variants"]) for p in products)} colours, {len(mismatches)} mismatches')

if __name__ == '__main__':
    main()
