/* Oldenhof Producten: offline product-info web app for shop employees.
   All product text comes from data/catalog.json (website first, booklet second). Nothing here adds facts. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const S = window.TeamStore;
  let C = null;                         // catalog
  const idx = {};                       // lookups

  // ---------- helpers ----------
  let LANG = (() => { try { return localStorage.getItem('oh.lang') || 'nl'; } catch { return 'nl'; } })();
  const L = (nl, en) => LANG === 'en' ? en : nl;
  const LOC = () => LANG === 'en' ? 'en-GB' : 'nl-NL';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(LOC(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; } };
  const fmtTime = iso => { try { return new Date(iso).toLocaleString(LOC(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
  const PALETTE = ['#D99E1A', '#29879E', '#B34033', '#4D73D9', '#40995A', '#9E529E'];
  const EMOJI = { pannen: '🍳', koffie: '☕', plaatstaal: '🔥', roestvrijstaal: '✨', gietijzer: '🫕', 'aluminium-antiaanbak': '🥚',
                  volautomaat: '🤖', halfautomaat: '🧑‍🍳', filterkoffie: '🫖' };
  const icon = (id, i) => `<span class="icon" style="background:${PALETTE[i % PALETTE.length]}33;color:${PALETTE[i % PALETTE.length]}">${EMOJI[id] || '•'}</span>`;
  const chev = '<span class="chev" aria-hidden="true"></span>';
  const backBtn = `<button class="back" onclick="history.length>1?history.back():location.hash='#/'" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`;
  const top = title => `<div class="top">${backBtn}<div class="title">${esc(title || '')}</div></div>`;
  function source(src) {
    if (!src) return '';
    if (src.kind === 'booklet') return `<div class="source">${L('Bron: informatieboekje, p.', 'Source: info booklet, p.')} ${esc(src.page)}</div>`;
    if (src.kind === 'website') return `<div class="source">${L('Bron', 'Source')}: <a href="${esc(src.url)}" target="_blank" rel="noopener">kookwinkel.nl</a>${src.checkedOn ? `, ${L('gecontroleerd', 'checked')} ${esc(fmtDate(src.checkedOn))}` : ''}${LANG === 'en' ? ' (translated from Dutch)' : ''}</div>`;
    return '';
  }
  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const productImg = (p, v) => (v || p.variants[0]).image;
  const outCount = p => p.variants.filter(v => S.isOut(v.id)).length;

  // ---------- data ----------
  let RAW = null, EN = null;
  const SKIPKEYS = new Set(['id', 'url', 'image', 'imageURL', 'productURL', 'officialURL', 'originalDescription', 'ean', 'articleNumber', 'colorHex', 'symbol', 'tone', 'kind', 'status']);
  function translate(o, k) {
    if (Array.isArray(o)) return o.map(x => translate(x, k));
    if (o && typeof o === 'object') { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = (SKIPKEYS.has(kk) || /IDs?$/.test(kk)) ? v : translate(v, kk); return r; }
    return typeof o === 'string' && EN && EN[o] ? EN[o] : o;
  }
  async function getJSON(u) {
    const res = await fetch(u, { cache: 'no-cache' }).catch(() => null) || await caches.match(u);
    if (!res || !res.ok) throw new Error(u); return res.json();
  }
  async function load() {
    if (!RAW) RAW = await getJSON('data/catalog.json');
    if (LANG === 'en' && !EN) EN = await getJSON('data/catalog.en.json').catch(() => ({}));
    C = LANG === 'en' ? translate(RAW) : RAW;
    document.documentElement.lang = LANG;
    idx.cat = Object.fromEntries(C.categories.map(c => [c.id, c]));
    idx.type = Object.fromEntries(C.typeGuides.map(t => [t.id, t]));
    idx.brand = Object.fromEntries(C.brands.map(b => [b.id, b]));
    idx.product = Object.fromEntries(C.products.map(p => [p.id, p]));
    idx.mm = Object.fromEntries(C.mismatches.map(m => [m.id, m]));
    idx.variant = {};
    idx.ean = {};
    C.products.forEach(p => p.variants.forEach(v => {
      idx.variant[v.id] = { p, v };
      if (v.ean) idx.ean[String(v.ean).replace(/^0+/, '')] = { p, v };
    }));
    idx.search = C.products.map(p => ({ p, hay: norm([p.name, idx.brand[p.brandID]?.name, ...p.typeIDs.map(t => idx.type[t]?.name),
      ...p.variants.flatMap(v => [v.colorName, v.ean, v.articleNumber])].join(' ')) }));
  }
  const productsOfType = t => C.products.filter(p => p.typeIDs.includes(t));
  const typesOfCat = c => C.typeGuides.filter(t => t.categoryID === c);
  const productsOfCat = c => C.products.filter(p => p.typeIDs.some(t => idx.type[t]?.categoryID === c));
  const openMismatches = ids => (ids || []).map(id => idx.mm[id]).filter(m => m && m.status !== 'resolved');

  // ---------- components ----------
  function productRow(p, sub) {
    const out = outCount(p);
    return `<a class="row" href="#/p/${esc(p.id)}">
      <img class="thumb" loading="lazy" src="${esc(productImg(p))}" alt="">
      <div class="grow"><div class="name">${esc(p.name)}</div>
        <div class="sub">${esc(sub ?? (p.suitedFor?.text || ''))}</div>
        ${out ? `<div style="margin-top:6px"><span class="pill neg">${out === p.variants.length ? L('Uitverkocht', 'Out of stock') : L(`${out} kleur${out > 1 ? 'en' : ''} uitverkocht`, `${out} colour${out > 1 ? 's' : ''} out of stock`)}</span></div>` : ''}
      </div>${chev}</a>`;
  }
  function mismatchBlock(m) {
    const label = m.kind === 'websiteData' ? L('Fout op de website', 'Error on the website') : m.kind === 'bookletVsWebsite' ? L('Boekje en website verschillen', 'Booklet and website differ') : L('Nog te controleren', 'Still to check');
    return `<div class="mm"><div class="t">${esc(m.topic)}</div>
      <div class="pills" style="margin:6px 0"><span class="pill ${m.status === 'confirmed' ? 'pos' : 'warn'}">${m.status === 'confirmed' ? L('Bevestigd', 'Confirmed') : L('Te controleren', 'To check')}</span><span class="pill">${label}</span></div>
      ${m.bookletSays ? `<div class="b"><b>${L('Boekje', 'Booklet')}${m.bookletPage ? ` (p. ${esc(m.bookletPage)})` : ''}:</b> ${esc(m.bookletSays)}</div>` : ''}
      ${m.websiteSays ? `<div class="b"><b>Website:</b> ${esc(m.websiteSays)}</div>` : ''}
      ${m.note ? `<div class="b"><b>${L('Let op', 'Note')}:</b> ${esc(m.note)}</div>` : ''}</div>`;
  }
  function mismatchCard(ids) {
    const list = openMismatches(ids);
    if (!list.length) return '';
    return `<details class="card"><summary>${L(`Let op: ${list.length} punt${list.length > 1 ? 'en' : ''} te controleren`, `Note: ${list.length} point${list.length > 1 ? 's' : ''} to check`)}</summary>${list.map(mismatchBlock).join('')}</details>`;
  }

  // ---------- views ----------
  const views = {};

  views.home = () => {
    const name = S.user;
    const toCheck = C.mismatches.filter(m => m.status !== 'confirmed' && m.status !== 'resolved').length;
    const outs = S.outList().length;
    return `<div class="hero"><div class="eyebrow">Kookwinkel Oldenhof</div><h1>${name ? `${L('Hoi', 'Hi')} ${esc(name.split(' ')[0])}` : L('Productinfo', 'Product info')}</h1>
        <p class="muted" style="margin:6px 0 0">${L('Wat wil de klant weten?', 'What does the customer want to know?')}</p>
        <div class="seg lang" style="margin-top:12px;max-width:140px"><button class="${LANG === 'nl' ? 'on' : ''}" data-act="lang" data-l="nl">NL</button><button class="${LANG === 'en' ? 'on' : ''}" data-act="lang" data-l="en">EN</button></div></div>
      <a class="search" href="#/zoek"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="faint">${L('Zoek product, merk of EAN', 'Search product, brand or EAN')}</span></a>
      <div class="tiles">
        ${C.categories.map((c, i) => `<a class="tile" href="#/c/${esc(c.id)}">${icon(c.id, i)}<div><div class="label">${esc(c.name)}</div><div class="count">${productsOfCat(c.id).length} ${L('producten', 'products')}</div></div></a>`).join('')}
        <a class="tile" href="#/scan"><span class="icon" style="background:#4D73D933;color:#7C9BF0"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/></svg></span><div><div class="label">Scan</div><div class="count">${L('Barcode op de doos', 'Barcode on the box')}</div></div></a>
      </div>
      ${S.remote && (!S.hasTeamCode || !name) ? setupCard() : ''}
      <div class="list">
        <a class="row" href="#/team?tab=voorraad"><div class="grow"><div class="name">${L('Uitverkocht', 'Out of stock')}</div><div class="sub">${outs ? L(`${outs} kleur${outs > 1 ? 'en' : ''} gemarkeerd`, `${outs} colour${outs > 1 ? 's' : ''} marked`) : L('Niets gemarkeerd', 'Nothing marked')}</div></div>${chev}</a>
        <a class="row" href="#/team?tab=notities"><div class="grow"><div class="name">${L("Notities van collega's", "Colleagues' notes")}</div><div class="sub">${S.allNotes().length} ${L('notities', 'notes')}</div></div>${chev}</a>
        <a class="row" href="#/check"><div class="grow"><div class="name">${L('Te controleren', 'To check')}</div><div class="sub">${toCheck} ${L('verschillen en fouten op de website', 'differences and website errors')}</div></div>${chev}</a>
        <a class="row" href="#/instellingen"><div class="grow"><div class="name">${L('Instellingen', 'Settings')}</div><div class="sub">${name ? esc(name) : L('Stel je naam in', 'Set your name')} · ${syncLabel()}</div></div>${chev}</a>
      </div>
      <p class="faint small" style="text-align:center">${L('Gegevens van', 'Data from')} ${esc(fmtDate(C.generatedOn))} · ${L('versie', 'version')} ${esc(C.version)}</p>`;
  };

  views.category = ([id]) => {
    const c = idx.cat[id]; if (!c) return notFound();
    const types = typesOfCat(id);
    return `${top('')}<div class="hero"><div class="eyebrow">${esc(c.groupingLabel || '')}</div><h1>${esc(c.name)}</h1></div>
      <div class="list">${types.map((t, i) => `<a class="row" href="#/t/${esc(t.id)}">${icon(t.id, i)}<div class="grow"><div class="name">${esc(t.name)}</div>
        <div class="sub">${esc(t.oneLiner?.text || t.subtitle || '')}</div><div class="sub faint">${productsOfType(t.id).length} ${L('producten', 'products')}</div></div>${chev}</a>`).join('')}</div>
      ${c.advice?.length ? `<h2>${L('Advies bij verkoop', 'Sales advice')}</h2><div class="card"><ul class="bullets">${c.advice.map(a => `<li>${esc(a.text)}</li>`).join('')}</ul>
        ${source(c.advice[0].source)}</div>` : ''}`;
  };

  views.type = ([id]) => {
    const t = idx.type[id]; if (!t) return notFound();
    const prods = productsOfType(id);
    const brands = [...new Set([...(t.brandIDs || []), ...prods.map(p => p.brandID)])].filter(b => idx.brand[b]);
    return `${top(idx.cat[t.categoryID]?.name)}<div class="hero"><div class="eyebrow">${esc(t.subtitle || '')}</div><h1>${esc(t.name)}</h1>
        ${t.oneLiner ? `<p class="muted">${esc(t.oneLiner.text)}</p>${source(t.oneLiner.source)}` : ''}</div>
      ${t.facts?.length ? `<div class="facts">${t.facts.map(f => `<div class="fact ${esc(f.tone)}"><div class="l">${esc(f.label)}</div><div class="v">${esc(f.value)}</div></div>`).join('')}</div>` : ''}
      ${mismatchCard(t.mismatchIDs)}
      <h2>${L('Merken', 'Brands')}</h2>
      <div class="list">${brands.map(b => {
        const n = prods.filter(p => p.brandID === b).length;
        return `<a class="row" href="#/t/${esc(id)}/b/${esc(b)}"><div class="grow"><div class="name">${esc(idx.brand[b].name)}</div>
          <div class="sub">${n ? `${n} model${n > 1 ? L('len', 's') : ''}` : L('Nog geen producten in de app', 'No products in the app yet')}</div></div>${chev}</a>`;
      }).join('')}</div>
      ${(t.sections || []).map(s => `<div class="card"><h3>${esc(s.title)}</h3><ul class="bullets">${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>${source(s.source)}</div>`).join('')}`;
  };

  views.brand = ([typeID, brandID]) => {
    const b = idx.brand[brandID]; if (!b) return notFound();
    const t = typeID ? idx.type[typeID] : null;
    const prods = C.products.filter(p => p.brandID === brandID && (!t || p.typeIDs.includes(typeID)));
    return `${top(t ? t.name : L('Merk', 'Brand'))}<div class="hero"><div class="eyebrow">${t ? esc(t.name) : L('Merk', 'Brand')}</div><h1>${esc(b.name)}</h1>
        ${b.officialURL ? `<p><a class="pill accent" href="${esc(b.officialURL)}" target="_blank" rel="noopener">${L('Officiële website', 'Official website')} ↗</a></p>` : ''}</div>
      ${prods.length ? `<h2>${L('Welk model past bij wie?', 'Which model suits whom?')}</h2><div class="list">${prods.map(p => productRow(p)).join('')}</div>`
        : `<div class="empty">${L('Nog geen producten van dit merk in de app.', 'No products from this brand in the app yet.')}</div>`}`;
  };

  views.product = ([id], q) => {
    const p = idx.product[id]; if (!p) return notFound();
    const v = p.variants.find(x => x.id === q.get('v')) || p.variants[0];
    const brand = idx.brand[p.brandID];
    const notes = S.notesFor(p.id);
    const out = S.isOut(v.id); const fl = S.flag(v.id);
    return `${top(brand?.name)}
      <div class="photo"><img src="${esc(v.image)}" alt="${esc(p.name + ' ' + v.colorName)}">
        ${out ? `<span class="pill neg flag">${L('Uitverkocht', 'Out of stock')}</span>` : ''}</div>
      <div class="hero" style="margin-top:0"><div class="eyebrow">${p.typeIDs.map(t => esc(idx.type[t]?.name || t)).join(' · ')}</div>
        <h1>${esc(p.name)}</h1>${p.suitedFor ? `<p class="muted">${esc(p.suitedFor.text)}</p>` : ''}</div>
      ${p.variants.length > 1 ? `<div class="card tight"><div class="small muted">${L('Kleur', 'Colour')}: <b style="color:var(--text)">${esc(v.colorName)}</b></div>
        <div class="swatches">${p.variants.map(x => `<a class="swatch ${x.id === v.id ? 'on' : ''} ${S.isOut(x.id) ? 'out' : ''}" href="#/p/${esc(p.id)}?v=${esc(x.id)}" aria-label="${esc(x.colorName)}" style="background-color:${esc(x.colorHex || '#888')}"></a>`).join('')}</div></div>` : ''}
      <div class="card">
        <dl class="kv"><dt>${L('Kleur', 'Colour')}</dt><dd>${esc(v.colorName)}</dd>
          <dt>EAN</dt><dd class="ean">${v.ean ? esc(v.ean) : `<span class="pill warn">${L('ontbreekt', 'missing')}</span>`}</dd>
          ${v.articleNumber ? `<dt>${L('Artikelnummer', 'Article number')}</dt><dd class="ean">${esc(v.articleNumber)}</dd>` : ''}</dl>
        <div class="toggle" style="margin-top:16px"><div><div class="name">${L('Uitverkocht', 'Out of stock')}</div>
          <div class="small faint">${fl ? `${fl.out ? L('Gemarkeerd', 'Marked') : L('Weer op voorraad', 'Back in stock')} ${L('door', 'by')} ${esc(fl.author)}, ${esc(fmtTime(fl.updatedAt))}` : L('Geldt alleen voor deze kleur', 'Applies to this colour only')}</div></div>
          <button class="switch ${out ? 'on' : ''}" role="switch" aria-checked="${out}" data-act="stock" data-v="${esc(v.id)}" aria-label="${L('Uitverkocht', 'Out of stock')}"></button></div>
      </div>
      <div class="card"><h3>${L('Kort voor de klant', 'In short for the customer')}</h3><ul class="bullets">${p.tellTheCustomer.map(b => `<li>${esc(b)}</li>`).join('')}</ul>${source(p.source)}</div>
      ${mismatchCard(p.mismatchIDs)}
      ${p.specs?.length ? `<div class="card"><h3 style="margin-bottom:12px">${L('Specificaties', 'Specifications')}</h3><dl class="kv">${p.specs.map(s => `<dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd>`).join('')}</dl>${source(p.source)}</div>` : ''}
      <div class="card"><h3>${L("Notities van collega's", "Colleagues' notes")}</h3>
        ${notes.length ? notes.map(n => `<div class="note">${esc(n.text)}<div class="meta"><span>${esc(n.author)} · ${esc(fmtTime(n.createdAt))}${n.variantID ? ` · ${esc(idx.variant[n.variantID]?.v.colorName || '')}` : ''}</span>
          <button class="faint" data-act="delnote" data-id="${esc(n.id)}">${L('Verwijder', 'Delete')}</button></div></div>`).join('') : `<p class="muted small">${L('Nog geen notities.', 'No notes yet.')}</p>`}
        <form data-act="addnote" data-p="${esc(p.id)}" data-v="${esc(v.id)}" style="margin-top:12px">
          <textarea name="t" placeholder="${L('Bijv. klanten vragen vaak… / demo-model staat bij de kassa', 'E.g. customers often ask… / demo model is at the till')}" maxlength="1000"></textarea>
          <label class="small muted" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" name="only"> ${L('Alleen voor kleur', 'Only for colour')} ${esc(v.colorName)}</label>
          <button class="btn block" type="submit">${L('Notitie opslaan', 'Save note')}</button></form></div>
      <details class="card"><summary>${L('Originele tekst van de website', 'Original website text (Dutch)')}</summary><p class="orig">${esc(p.originalDescription)}</p>
        <div class="source"><a href="${esc(v.productURL)}" target="_blank" rel="noopener">${L('Open op kookwinkel.nl', 'Open on kookwinkel.nl')} ↗</a></div></details>
      ${brand?.officialURL ? `<a class="btn ghost block" href="${esc(brand.officialURL)}" target="_blank" rel="noopener">${L(`Officiële ${esc(brand.name)}-website`, `Official ${esc(brand.name)} website`)} ↗</a>` : ''}`;
  };

  views.search = (_, q) => {
    const term = q.get('q') || '';
    return `<div class="hero"><h1>${L('Zoeken', 'Search')}</h1></div>
      <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="${L('Product, merk, kleur of EAN', 'Product, brand, colour or EAN')}" value="${esc(term)}"></label>
      <div id="results">${results(term)}</div>`;
  };
  function results(term) {
    const toks = norm(term).split(/\s+/).filter(Boolean);
    if (!toks.length) return `<div class="empty">${L('Typ een naam, merk, kleur of barcode.', 'Type a name, brand, colour or barcode.')}</div>`;
    const hits = idx.search.filter(x => toks.every(t => x.hay.includes(t))).map(x => x.p);
    if (!hits.length) return `<div class="empty">${L('Niets gevonden voor', 'Nothing found for')} “${esc(term)}”.</div>`;
    return `<p class="muted small">${hits.length} ${L('resultaten', 'results')}</p><div class="list">${hits.slice(0, 80).map(p => productRow(p, idx.brand[p.brandID]?.name + ' · ' + p.typeIDs.map(t => idx.type[t]?.name).join(', '))).join('')}</div>`;
  }

  views.scan = () => `<div class="hero"><h1>${L('Barcode scannen', 'Scan barcode')}</h1><p class="muted">${L('Richt de camera op de streepjescode op de doos.', 'Point the camera at the barcode on the box.')}</p></div>
      <div class="scanner"><video id="video" playsinline muted></video><div class="frame"></div></div>
      <form data-act="ean" class="card tight" style="display:flex;gap:10px"><input class="field" name="ean" inputmode="numeric" placeholder="${L('Of typ de EAN', 'Or type the EAN')}" autocomplete="off"><button class="btn" type="submit">${L('Zoek', 'Search')}</button></form>
      <p id="scanmsg" class="muted small" style="text-align:center"></p>`;

  views.team = (_, q) => {
    const tab = q.get('tab') || 'voorraad';
    let body;
    if (tab === 'voorraad') {
      const list = S.outList().map(f => ({ f, x: idx.variant[f.variantID] })).filter(o => o.x);
      body = list.length ? `<div class="list">${list.map(({ f, x }) => `<a class="row" href="#/p/${esc(x.p.id)}?v=${esc(x.v.id)}"><img class="thumb" src="${esc(x.v.image)}" alt="">
        <div class="grow"><div class="name">${esc(x.p.name)}</div><div class="sub">${esc(x.v.colorName)} · EAN ${esc(x.v.ean || '–')}</div>
        <div class="sub faint">${esc(f.author)} · ${esc(fmtTime(f.updatedAt))}</div></div>${chev}</a>`).join('')}</div>`
        : `<div class="empty">${L('Niets gemarkeerd als uitverkocht.', 'Nothing marked as out of stock.')}</div>`;
    } else {
      const list = S.allNotes().filter(n => idx.product[n.productID]);
      body = list.length ? `<div class="list">${list.map(n => { const p = idx.product[n.productID]; return `<a class="row" href="#/p/${esc(p.id)}"><div class="grow">
        <div class="name">${esc(p.name)}</div><div class="sub">${esc(n.text)}</div><div class="sub faint">${esc(n.author)} · ${esc(fmtTime(n.createdAt))}</div></div>${chev}</a>`; }).join('')}</div>`
        : `<div class="empty">${L('Nog geen notities.', 'No notes yet.')}</div>`;
    }
    return `<div class="hero"><h1>Team</h1><p class="muted small"><span class="status-dot ${S.remote ? (S.state.error ? 'off' : 'on') : ''}"></span>${syncLabel()}</p></div>
      <div class="seg"><button class="${tab === 'voorraad' ? 'on' : ''}" onclick="location.hash='#/team?tab=voorraad'">${L('Uitverkocht', 'Out of stock')}</button>
        <button class="${tab === 'notities' ? 'on' : ''}" onclick="location.hash='#/team?tab=notities'">${L('Notities', 'Notes')}</button></div>${S.remote && (!S.hasTeamCode || !S.user) ? setupCard() : ''}${body}`;
  };

  views.check = () => {
    const groups = [
      [L('Verschillen boekje en website', 'Differences booklet vs website'), m => m.kind === 'bookletVsWebsite' && m.status !== 'confirmed', true],
      [L('Fouten op de website', 'Errors on the website'), m => m.kind === 'websiteData' && m.status !== 'confirmed'],
      [L('Nog te controleren', 'Still to check'), m => !m.kind && m.status !== 'confirmed'],
      [L('Bevestigd', 'Confirmed'), m => m.status === 'confirmed']];
    return `${top('')}<div class="hero"><h1>${L('Te controleren', 'To check')}</h1><p class="muted">${L('Punten waar het boekje en de website verschillen, of waar de website zelf iets fout toont. Vertel het de bedrijfsleider als je het antwoord weet.', 'Points where the booklet and the website differ, or where the website itself shows something wrong. Tell the manager if you know the answer.')}</p></div>
      ${groups.map(([title, f, open]) => { const l = C.mismatches.filter(f); return l.length ? `<details class="card" ${open ? 'open' : ''}><summary>${esc(title)} (${l.length})</summary>${l.map(m =>
        mismatchBlock(m) + (m.productIDs ? `<div class="small" style="margin:-6px 0 10px 17px">${m.productIDs.filter(id => idx.product[id]).map(id => `<a style="color:var(--accent)" href="#/p/${esc(id)}">${esc(idx.product[id].name)} →</a>`).join(' ')}</div>` : '')).join('')}</details>` : ''; }).join('')}`;
  };

  // name + team code in one card (home, team tab and settings)
  const setupCard = () => `<form data-act="setup" class="card" style="border-color:var(--accent)"><h3>${S.hasTeamCode && S.user ? L('Naam en teamcode', 'Name and team code') : L('Welkom! Eenmalig instellen', 'Welcome! One-time setup')}</h3>
      <p class="muted small">${L("Met je naam en de teamcode zie je de notities en voorraad van collega's.", "With your name and the team code you see your colleagues' notes and stock flags.")}</p>
      <input class="field" name="n" value="${esc(S.user)}" placeholder="${L('Je voornaam', 'Your first name')}" autocomplete="given-name" style="margin-bottom:10px">
      <input class="field" name="c" type="text" placeholder="${S.hasTeamCode ? L('Teamcode ingesteld (wijzigen?)', 'Team code set (change?)') : L('Teamcode', 'Team code')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" style="margin-bottom:10px">
      <button class="btn block">${L('Opslaan', 'Save')}</button></form>`;

  views.settings = () => `${top('')}<div class="hero"><h1>${L('Instellingen', 'Settings')}</h1></div>
    <div class="card"><h3>${L('Taal', 'Language')}</h3><div class="seg lang"><button class="${LANG === 'nl' ? 'on' : ''}" data-act="lang" data-l="nl">Nederlands</button><button class="${LANG === 'en' ? 'on' : ''}" data-act="lang" data-l="en">English</button></div>
      ${LANG === 'en' ? '<p class="small faint" style="margin-top:8px">Product texts are translated from the Dutch website. The original Dutch text is under each product.</p>' : ''}</div>
    ${S.remote ? setupCard() : ''}
    <div class="card"><h3>${L('Delen met het team', 'Sharing with the team')}</h3><p class="muted small"><span class="status-dot ${S.remote ? (S.state.error ? 'off' : 'on') : ''}"></span>${syncLabel()}</p>
      ${S.remote ? `<button class="btn ghost block" data-act="sync">${L('Nu bijwerken', 'Update now')}</button>` : `<p class="small faint">${L('Notities en markeringen worden nu alleen op dit toestel bewaard.', 'Notes and flags are only stored on this device for now.')}</p>`}</div>
    <div class="card"><h3>${L('Op je beginscherm zetten', 'Add to your home screen')}</h3><ul class="bullets">
      ${L(`<li><b>iPhone (Safari):</b> deel-knop → “Zet op beginscherm”.</li>
      <li><b>Android (Chrome):</b> menu ⋮ → “App installeren” of “Toevoegen aan startscherm”.</li>
      <li>Daarna werkt de app ook zonder internet.</li>`, `<li><b>iPhone (Safari):</b> share button → “Add to Home Screen”.</li>
      <li><b>Android (Chrome):</b> menu ⋮ → “Install app” or “Add to Home screen”.</li>
      <li>After that the app also works without internet.</li>`)}</ul></div>
    <p class="faint small" style="text-align:center">${L('Productgegevens: kookwinkel.nl en het informatieboekje', 'Product data: kookwinkel.nl and the info booklet')} · ${esc(C.products.length)} ${L('producten', 'products')}</p>`;

  function syncLabel() {
    if (!S.remote) return L('Alleen op dit toestel', 'This device only');
    if (!S.hasTeamCode) return L('Teamcode nog niet ingesteld', 'Team code not set yet');
    if (!navigator.onLine) return L(`Offline · ${S.pending()} wijziging(en) wachten`, `Offline · ${S.pending()} change(s) waiting`);
    if (S.state.syncing) return L('Bijwerken…', 'Updating…');
    if (S.state.error) return (S.state.error === 'teamcode' || /\b40[13]\b/.test(S.state.error)) ? L('Teamcode klopt niet. Vul hem opnieuw in.', 'Team code is wrong. Please enter it again.') : L('Delen lukt niet: ', 'Sharing failed: ') + S.state.error;
    return S.state.lastSync ? L(`Gedeeld · bijgewerkt ${fmtTime(S.state.lastSync)}`, `Shared · updated ${fmtTime(S.state.lastSync)}`) : L('Gedeeld', 'Shared');
  }
  function notFound() { return `${top('')}<div class="empty">${L('Niet gevonden.', 'Not found.')}</div>`; }

  // ---------- router ----------
  let stopScan = null;
  function route() {
    if (stopScan) { stopScan(); stopScan = null; }
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const q = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    let html, tab = 'home';
    if (!parts.length) html = views.home();
    else if (parts[0] === 'c') html = views.category(parts.slice(1));
    else if (parts[0] === 't' && parts[2] === 'b') html = views.brand([parts[1], parts[3]]);
    else if (parts[0] === 't') html = views.type(parts.slice(1));
    else if (parts[0] === 'b') html = views.brand([null, parts[1]]);
    else if (parts[0] === 'p') html = views.product(parts.slice(1), q);
    else if (parts[0] === 'zoek') { html = views.search(parts, q); tab = 'zoek'; }
    else if (parts[0] === 'scan') { html = views.scan(); tab = 'scan'; }
    else if (parts[0] === 'team') { html = views.team(parts, q); tab = 'team'; }
    else if (parts[0] === 'check') html = views.check();
    else if (parts[0] === 'instellingen') html = views.settings();
    else html = notFound();
    app.innerHTML = html;
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    if (route.last !== location.hash.split('?')[0]) window.scrollTo(0, 0);
    route.last = location.hash.split('?')[0];
    if (tab === 'zoek') wireSearch();
    if (tab === 'scan') startScan();
  }
  function wireSearch() {
    const input = document.getElementById('q'); if (!input) return;
    if (!input.value) input.focus();
    input.addEventListener('input', () => {
      document.getElementById('results').innerHTML = results(input.value);
      history.replaceState(null, '', '#/zoek' + (input.value ? '?q=' + encodeURIComponent(input.value) : ''));
    });
  }

  // ---------- barcode ----------
  function openEAN(code) {
    const hit = idx.ean[String(code).trim().replace(/^0+/, '')];
    if (hit) { location.hash = `#/p/${hit.p.id}?v=${hit.v.id}`; return true; }
    toast(L(`EAN ${code} staat (nog) niet in de app`, `EAN ${code} is not in the app (yet)`)); return false;
  }
  async function startScan() {
    const video = document.getElementById('video'); const msg = document.getElementById('scanmsg');
    if (!navigator.mediaDevices?.getUserMedia) { msg.textContent = L('Camera niet beschikbaar. Typ de EAN hierboven.', 'Camera not available. Type the EAN above.'); return; }
    let stopped = false, stream = null, reader = null, lastMiss = '';
    stopScan = () => { stopped = true; if (reader) try { reader.reset(); } catch {} if (stream) stream.getTracks().forEach(t => t.stop()); };
    const handle = code => { if (stopped) return; if (idx.ean[String(code).replace(/^0+/, '')]) { stopScan(); openEAN(code); } else if (code !== lastMiss) { lastMiss = code; toast(L(`EAN ${code} staat (nog) niet in de app`, `EAN ${code} is not in the app (yet)`)); } };
    try {
      if ('BarcodeDetector' in window) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = stream; await video.play();
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        const tick = async () => { if (stopped) return; try { const r = await det.detect(video); if (r[0]) handle(r[0].rawValue); } catch {} setTimeout(tick, 250); };
        tick();
      } else {
        if (!window.ZXing) await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'vendor/zxing.min.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
        if (stopped) return;
        reader = new ZXing.BrowserMultiFormatReader();
        await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, r => { if (r) handle(r.getText()); });
      }
      msg.textContent = L('Camera aan. Houd de barcode in het gele kader.', 'Camera on. Hold the barcode inside the yellow frame.');
    } catch (e) {
      msg.textContent = L('Geen toegang tot de camera. Sta de camera toe in de instellingen, of typ de EAN hierboven.', 'No camera access. Allow the camera in your settings, or type the EAN above.');
    }
  }

  // ---------- actions ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'FORM') return;
    if (b.dataset.act === 'stock') {
      const x = idx.variant[b.dataset.v]; const now = !S.isOut(x.v.id);
      S.setOut(x.p.id, x.v.id, now); const cn = idx.variant[x.v.id].v.colorName; toast(now ? L(`${cn} gemarkeerd als uitverkocht`, `${cn} marked out of stock`) : L(`${cn} weer op voorraad`, `${cn} back in stock`));
    } else if (b.dataset.act === 'delnote') {
      if (confirm(L('Deze notitie verwijderen?', 'Delete this note?'))) S.deleteNote(b.dataset.id);
    } else if (b.dataset.act === 'sync') { S.sync(); }
    else if (b.dataset.act === 'lang' && b.dataset.l !== LANG) {
      LANG = b.dataset.l; try { localStorage.setItem('oh.lang', LANG); } catch {}
      load().then(route);
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.dataset.act) return; e.preventDefault();
    if (f.dataset.act === 'addnote') {
      const t = f.t.value.trim(); if (!t) return;
      if (!S.user) { const n = prompt(L('Wat is je naam? (staat bij je notities)', 'What is your name? (shown with your notes)')); if (n) S.user = n.trim(); }
      S.addNote(f.dataset.p, f.only.checked ? f.dataset.v : null, t); toast(L('Notitie opgeslagen', 'Note saved'));
    } else if (f.dataset.act === 'setup') {
      const n = f.n.value.trim(), c = f.c.value.trim();
      if (n) S.user = n;
      if (c) S.setTeamCode(c);
      f.c.value = ''; document.activeElement?.blur?.(); toast(L('Opgeslagen', 'Saved')); route();
    }
    else if (f.dataset.act === 'ean') { const v = f.ean.value.replace(/\D/g, ''); if (v) openEAN(v); }
  });
  S.onChange(() => {
    // re-render only views that show team data, and never while typing
    const a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) return;
    if (!/^#\/(zoek|scan)/.test(location.hash)) { const y = scrollY; route(); scrollTo(0, y); }
  });

  // ---------- start ----------
  window.addEventListener('hashchange', route);
  load().then(route).catch(() => { app.innerHTML = `<div class="empty">${L('De gegevens konden niet worden geladen. Open de app één keer met internet.', 'The data could not be loaded. Open the app once with internet.')}</div>`; });
  if ('serviceWorker' in navigator) {
    // when a new version is installed, reload once so nobody keeps an old copy
    const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    });
  }
})();
