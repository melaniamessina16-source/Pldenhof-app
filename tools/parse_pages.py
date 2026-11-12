#!/usr/bin/env python3
"""Read product pages saved from kookwinkel.nl (Cmd+S, HTML) and write one JSON record per page.

Usage: python3 -I tools/parse_pages.py OUT.json page1.html page2.html ...

Takes only what the page itself says: the schema.org Product block (name, EAN, SKU,
image), the "Product beschrijving" text and the "Product specificaties" table.
"""
import html, json, re, sys

from bs4 import BeautifulSoup

def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(s or '')).strip()

def product_ld(soup):
    for tag in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(tag.string or '')
        except ValueError:
            continue
        if isinstance(data, dict) and data.get('@type') == 'Product':
            return data
    return {}

def specs(soup):
    box = soup.find(id='product-attributes')
    out = []
    if box:
        for label in box.find_all(class_='product-attribute-label'):
            value = label.find_next_sibling(class_='product-attribute-value')
            pair = (clean(label.get_text(' ')), clean(value.get_text(' ')) if value else '')
            if pair[0] and pair not in out:
                out.append(pair)
    return [{'label': a, 'value': b} for a, b in out]

def description(soup):
    """Paragraphs, sub-headings and bullets of the 'Product beschrijving' block, in page order.
    Text sitting loose in a <div> (no <p>) is kept too: some pages are written that way."""
    box = soup.find(id='description')
    parts = []
    if not box:
        return parts
    BLOCK = ('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'div', 'td', 'section', 'ul', 'ol')
    runs, last = [], None
    for s in box.find_all(string=True):
        if s.parent.name in ('script', 'style') or not s.strip():
            continue
        block = s.find_parent(BLOCK)
        if block is last and runs:
            runs[-1][1].append(str(s))
        else:
            runs.append((block, [str(s)])); last = block
    for block, texts in runs:
        text = clean(' '.join(texts))
        if not text or text == 'Product beschrijving':
            continue
        name = block.name if block else 'p'
        kind = 'heading' if name[0] == 'h' and name[1:].isdigit() else ('bullet' if name == 'li' else 'text')
        parts.append({'kind': kind, 'text': text})
    return parts

def canonical(soup, raw):
    link = soup.find('link', rel='canonical')
    if link and link.get('href'):
        return link['href']
    m = re.search(r'url: (https://www\.kookwinkel\.nl/\S+)', raw)  # SingleFile header comment
    return m.group(1) if m else None

def meta(soup, prop):
    tag = soup.find('meta', property=prop)
    return clean(tag.get('content')) if tag else None

def category(raw):
    m = re.search(r'data-category="?([^"> ]*)', raw)
    return html.unescape(m.group(1)) if m else None

def parse(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    soup = BeautifulSoup(raw, 'lxml')
    ld = product_ld(soup)
    spec_rows = specs(soup)
    spec = {r['label']: r['value'] for r in spec_rows}
    brand = ld.get('brand')
    brand = brand.get('name') if isinstance(brand, dict) else brand
    image = ld.get('image') or meta(soup, 'og:image')
    if isinstance(image, list):
        image = image[0] if image else None
    title = clean(soup.title.get_text()) .split(' | ')[0].strip() if soup.title else None
    root = soup.find('html')
    classes = ' '.join(root.get('class', [])) if root else ''
    return {
        'file': path.rsplit('/', 1)[-1],
        'lang': root.get('lang') if root else None,
        'translatedByBrowser': 'translated-' in classes,
        'url': canonical(soup, raw),
        'name': ld.get('name') or meta(soup, 'og:title') or title,
        'brand': brand or spec.get('Merk'),
        'sku': ld.get('sku'),
        'ean': ld.get('gtin13') or ld.get('gtin') or spec.get('EAN'),
        'image': image.split('?')[0] if image else None,
        'category': category(raw),
        'specs': spec_rows,
        'description': description(soup),
    }

if __name__ == '__main__':
    records = [parse(p) for p in sys.argv[2:]]
    json.dump(records, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for r in records:
        print(r['name'], '| EAN', r['ean'], '| specs', len(r['specs']), '| desc', len(r['description']), '| nl' if r['lang'] == 'nl' else '| LANG ' + str(r['lang']), '| TRANSLATED' if r['translatedByBrowser'] else '')
