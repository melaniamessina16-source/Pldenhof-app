/* Runs inside a kookwinkel.nl tab (your own browser session). It loads product pages one by one, slowly,
   keeps only what the Oldenhof app needs (schema.org block, specifications, description, canonical link)
   and downloads them as numbered JSON files. It never tries to get past the site's verification:
   if the site asks for it, the run pauses and you solve it yourself in the tab. */
(function () {
  'use strict';
  if (window.__ohExport && window.__ohExport.running) return;
  const DONE_KEY = 'ohexp.done';
  const ORIGIN = location.origin;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const loadDone = () => { try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch { return new Set(); } };
  const saveDone = s => { try { localStorage.setItem(DONE_KEY, JSON.stringify([...s])); } catch {} };

  const st = { running: false, paused: false, stop: false, phase: 'idle', total: 0, done: 0, saved: 0, skippedNotProduct: 0, failed: 0, files: 0, message: '', blocked: false, current: '' };

  const looksBlocked = (res, text) => res.status === 403 || res.status === 429 || res.status === 503 ||
    /anubis|human verification|just a moment|cf-challenge/i.test(text.slice(0, 6000)) && !/application\/ld\+json/.test(text);

  // the part of a page the importer needs, as a small HTML document the existing parser reads unchanged
  function compact(doc, url) {
    const q = s => doc.querySelector(s);
    const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent);
    if (!ld.some(t => /"@type"\s*:\s*"Product"/.test(t))) return null;
    const can = q('link[rel=canonical]')?.href || url;
    const attrs = doc.getElementById('product-attributes'), desc = doc.getElementById('description');
    const cat = doc.querySelector('[data-category]')?.getAttribute('data-category') || '';
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const meta = p => { const m = doc.querySelector(`meta[property="${p}"]`); return m ? `<meta property="${p}" content="${esc(m.content)}">` : ''; };
    return `<!doctype html><html lang="${esc(doc.documentElement.lang || '')}"><head><meta charset="utf-8"><link rel="canonical" href="${esc(can)}"><title>${esc(doc.title)}</title>` +
      meta('og:title') + meta('og:image') + ld.map(t => `<script type="application/ld+json">${t.replace(/<\/script/gi, '<\\/script')}</script>`).join('') +
      `</head><body><div data-category="${esc(cat)}"></div>${attrs ? attrs.outerHTML : ''}${desc ? desc.outerHTML : ''}</body></html>`;
  }

  // links to products on a category page (and its next pages)
  function productLinks(doc) {
    const out = new Set();
    doc.querySelectorAll('[class*="product-item"] a[href], [class*="product-card"] a[href]').forEach(a => {
      let u; try { u = new URL(a.getAttribute('href'), ORIGIN); } catch { return; }
      if (u.origin !== ORIGIN || /\.(jpg|png|webp|pdf)$/i.test(u.pathname) || /^\/(checkout|customer|wishlist|catalogsearch)/.test(u.pathname)) return;
      u.hash = ''; u.search = ''; out.add(u.toString());
    });
    return [...out];
  }
  async function collectFromListing(maxPages = 80) {
    st.phase = 'collecting'; st.message = 'Links verzamelen…';
    const all = new Set(productLinks(document));
    for (let p = 2; p <= maxPages && !st.stop; p++) {
      const u = new URL(location.href); u.searchParams.set('p', p);
      await waitIfPaused(); await sleep(900 + Math.random() * 600);
      const res = await fetch(u, { credentials: 'same-origin' });
      const text = await res.text();
      if (looksBlocked(res, text)) { st.blocked = true; st.paused = true; st.message = 'De website vraagt om verificatie. Los dit op in dit tabblad en druk op Verder.'; await waitIfPaused(); p--; continue; }
      const links = productLinks(new DOMParser().parseFromString(text, 'text/html'));
      const before = all.size; links.forEach(l => all.add(l));
      st.total = all.size; st.message = `Links verzamelen… pagina ${p}, ${all.size} gevonden`;
      if (all.size === before) break;
    }
    return [...all];
  }
  async function waitIfPaused() { while (st.paused && !st.stop) await sleep(400); }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  async function run(opts) {
    Object.assign(st, { running: true, paused: false, stop: false, blocked: false, done: 0, saved: 0, failed: 0, skippedNotProduct: 0, files: 0, message: '' });
    const label = (opts.label || 'export').replace(/[^\w-]+/g, '-').slice(0, 40);
    const delay = Math.max(1000, opts.delayMs || 1500), chunkSize = opts.chunk || 200;
    let urls;
    if (opts.urls && opts.urls.length) { urls = opts.urls; try { localStorage.setItem('ohexp.urls', JSON.stringify(opts.urls)); } catch {} }
    else if (opts.useSaved && localStorage.getItem('ohexp.urls')) { try { urls = JSON.parse(localStorage.getItem('ohexp.urls')); } catch { urls = []; } }
    else { try { localStorage.removeItem('ohexp.urls'); } catch {} urls = await collectFromListing(); }
    urls = [...new Set(urls.map(u => u.trim()).filter(u => { try { return new URL(u).origin === ORIGIN; } catch { return false; } }))];
    const done = opts.resume ? loadDone() : new Set();
    if (!opts.resume) saveDone(done);
    const todo = urls.filter(u => !done.has(u));
    st.total = todo.length; st.phase = 'loading';
    if (!todo.length) { st.message = urls.length ? 'Alles was al gedaan (klik "Opnieuw beginnen" om alles nogmaals te doen).' : 'Geen productlinks gevonden op deze pagina. Gebruik "Links plakken".'; st.running = false; st.phase = 'finished'; return; }
    let buf = [], pendingDone = [], fails = 0, part = Number(localStorage.getItem('ohexp.part.' + label) || 0);
    const flush = () => { if (!buf.length) return; part++; localStorage.setItem('ohexp.part.' + label, String(part));
      download(`oldenhof-${label}-${String(part).padStart(3, '0')}.json`, { exportedAt: new Date().toISOString(), source: 'oldenhof-export 1.0', pages: buf });
      st.files++; pendingDone.forEach(u => done.add(u)); saveDone(done); buf = []; pendingDone = []; };
    for (let i = 0; i < todo.length && !st.stop; i++) {
      await waitIfPaused(); if (st.stop) break;
      const url = todo[i]; st.current = url; st.message = 'Bezig…';
      try {
        const res = await fetch(url, { credentials: 'same-origin', redirect: 'follow' });
        const text = await res.text();
        if (looksBlocked(res, text)) {
          st.blocked = true; st.paused = true; st.message = 'De website vraagt om verificatie. Los dit op in dit tabblad (herlaad de pagina en doorloop de controle zelf), start daarna opnieuw met "Verder met opslaan".';
          flush(); st.running = false; st.phase = 'blocked'; return;
        }
        if (!res.ok) { st.failed++; fails++; }
        else {
          fails = 0;
          const html = compact(new DOMParser().parseFromString(text, 'text/html'), res.url);
          if (html) { buf.push({ url: res.url, html }); pendingDone.push(url); st.saved++; } else { st.skippedNotProduct++; pendingDone.push(url); }
        }
      } catch (e) { st.failed++; fails++; }
      st.done = i + 1;
      if (fails >= 4) { st.message = 'Vier fouten achter elkaar: gestopt. Controleer je internet of de website en probeer later opnieuw.'; break; }
      if (buf.length >= chunkSize) flush();
      await sleep(delay + Math.random() * delay * 0.5);
    }
    flush();
    st.running = false; st.phase = st.stop ? 'stopped' : 'finished';
    if (!st.message || st.message === 'Bezig…') st.message = st.stop ? 'Gestopt. Wat al klaar was, is opgeslagen.' : 'Klaar!';
  }

  window.__ohExport = {
    get running() { return st.running; },
    status: () => ({ ...st, done_total: st.total }),
    start: opts => { run(opts || {}); return true; },
    pause: () => { st.paused = true; st.message = 'Gepauzeerd.'; },
    resume: () => { st.paused = false; st.blocked = false; st.message = 'Bezig…'; },
    stop: () => { st.stop = true; st.paused = false; },
    reset: () => { localStorage.removeItem(DONE_KEY); localStorage.removeItem('ohexp.urls'); Object.keys(localStorage).filter(k => k.startsWith('ohexp.part.')).forEach(k => localStorage.removeItem(k)); },
    hasSaved: () => ({ urls: !!localStorage.getItem('ohexp.urls'), done: loadDone().size }),
    countLinks: () => productLinks(document).length,
    _compact: compact, _productLinks: productLinks,
  };
})();
