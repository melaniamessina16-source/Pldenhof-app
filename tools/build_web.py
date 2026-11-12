#!/usr/bin/env python3
"""Prepare the web app (web/) from data/catalog.json.

Usage (from oldenhof-app/):  python3 -I tools/build_web.py [raw-image-folder]
  * writes docs/data/catalog.json with an `image` path per colour
  * makes docs/img/<variant-id>.webp (640 px) from <raw-image-folder>/<variant-id>.src when missing;
    raw images are the kookwinkel.nl /media files from each variant's imageURL
  * writes docs/sw.js: offline cache of the app, the data and every photo. The cache name changes
    whenever any file changes, so phones pick up the new version on their next online start.
"""
import hashlib, json, os, sys

WEB = 'docs'
SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'sync.js', 'config.js', 'manifest.webmanifest',
         'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'vendor/zxing.min.js',
         'data/catalog.json']

def main(raw=None):
    cat = json.load(open('data/catalog.json', encoding='utf-8'))
    missing = []
    for p in cat['products']:
        for v in p['variants']:
            rel = f'img/{v["id"]}.webp'; out = os.path.join(WEB, rel)
            if not os.path.exists(out) and raw and os.path.exists(os.path.join(raw, v['id'] + '.src')):
                from PIL import Image
                im = Image.open(os.path.join(raw, v['id'] + '.src')); im.load()
                if im.mode in ('P', 'LA', 'RGBA'):
                    im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); im = bg
                im = im.convert('RGB'); im.thumbnail((640, 640)); im.save(out, 'WEBP', quality=78)
            if os.path.exists(out): v['image'] = rel
            else: v['image'] = 'icons/icon-512.png'; missing.append(v['id'])
    os.makedirs(os.path.join(WEB, 'data'), exist_ok=True)
    json.dump(cat, open(os.path.join(WEB, 'data/catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    images = sorted({v['image'] for p in cat['products'] for v in p['variants']})
    h = hashlib.sha256()
    for f in SHELL[1:] + images:
        h.update(f.encode()); h.update(open(os.path.join(WEB, f), 'rb').read())
    version = h.hexdigest()[:10]
    sw = open('tools/sw.template.js', encoding='utf-8').read()
    sw = sw.replace('__VERSION__', version).replace('__SHELL__', json.dumps(SHELL)).replace('__IMAGES__', json.dumps(images))
    open(os.path.join(WEB, 'sw.js'), 'w', encoding='utf-8').write(sw)
    print(f'version {version}: {len(images)} photos, missing {len(missing)} {missing[:5]}')

if __name__ == '__main__':
    main(*sys.argv[1:2])
