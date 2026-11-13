#!/usr/bin/env python3
"""Turn the files made by the Oldenhof export extension into the same records as tools/parse_pages.py.

Usage: python3 -I tools/import_export.py OUT.json oldenhof-export-001.json [more.json ...]

Each export file holds {"pages": [{"url", "html"}]}. The compact HTML of every page is written to a
temporary folder and read by parse_pages.py, so a page from the extension and a page saved by hand
give identical records. Pages seen twice (same url) are used once.
"""
import json, os, re, subprocess, sys, tempfile

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out, files = sys.argv[1], sys.argv[2:]
    pages, seen = [], set()
    for f in files:
        for p in json.load(open(f, encoding='utf-8'))['pages']:
            if p['url'] not in seen:
                seen.add(p['url']); pages.append(p)
    here = os.path.dirname(os.path.abspath(__file__))
    with tempfile.TemporaryDirectory() as tmp:
        paths = []
        for i, p in enumerate(pages):
            slug = re.sub(r'[^\w.-]+', '-', p['url'].rstrip('/').rsplit('/', 1)[-1])[:80] or str(i)
            path = os.path.join(tmp, f'{i:05d}-{slug}.html')
            open(path, 'w', encoding='utf-8').write(p['html'])
            paths.append(path)
        # parse in batches so the command line stays short
        records = []
        for i in range(0, len(paths), 200):
            part = os.path.join(tmp, f'part{i}.json')
            subprocess.run([sys.executable, '-I', os.path.join(here, 'parse_pages.py'), part, *paths[i:i + 200]], check=True, stdout=subprocess.DEVNULL)
            records += json.load(open(part, encoding='utf-8'))
    json.dump(records, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(records)} pages -> {out}')

if __name__ == '__main__':
    main()
