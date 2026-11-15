/* Oldenhof Producten: offline product-info web app for shop employees.
   Product text comes from data/catalog.json (website first, booklet second); the product guide and quiz
   come from data/booklet.json and data/quiz.json (the information booklet). Nothing here adds facts. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const S = window.TeamStore;
  let C = null;                         // catalog (in the current language)
  let B = null, Q = null;               // booklet, quizzes
  let TASKS = null, FOLDERS = {};       // daily/weekly tasks (booklet ch. 3), brand folders (e.g. the Sage chart)
  const idx = {};                       // lookups

  // ---------- language, theme, helpers ----------
  const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  let LANG = pref('oh.lang', 'nl');
  let THEME = pref('oh.theme', 'dark');
  const applyTheme = () => { document.documentElement.dataset.theme = THEME; };
  applyTheme();
  const L = (nl, en) => LANG === 'en' ? en : nl;
  const LT = o => o ? (LANG === 'en' ? (o.en || o.nl) : o.nl) : '';
  const LOC = () => LANG === 'en' ? 'en-GB' : 'nl-NL';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(LOC(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; } };
  const fmtTime = iso => { try { return new Date(iso).toLocaleString(LOC(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
  const PALETTE = ['#D99E1A', '#29879E', '#B34033', '#4D73D9', '#40995A', '#9E529E'];
  const IC = (n, cls) => window.Icons.svg(n, cls);
  const GROUP_ICON = { pannen: 'pan', koffie: 'coffee', messen: 'knife', 'klein-elektrisch': 'plug', fornuis: 'flame', 'koffie-espresso': 'coffee', 'kassa-groepen': 'receipt',
                  producten: 'box', plaatstaal: 'disc', roestvrijstaal: 'sparkle', gietijzer: 'casserole', 'aluminium-antiaanbak': 'egg',
                  volautomaat: 'robot', halfautomaat: 'hand', filterkoffie: 'kettle' };
  // icons for booklet topics and their parts: decoration only, picked from words in the title
  const PICS = [[/verkoop|aandachtspunt/, 'chat'], [/onderhoud|schoonma|vliegroest|waas/, 'sponge'], [/aanzet|slijp/, 'stone'], [/anatomie|heft|lemmet|krop|snede/, 'knife'],
    [/aziat|europe|mes/, 'knife'], [/mandoline/, 'leaf'], [/snijplank|hout|kunststof|gerecycled/, 'board'], [/snijmachine|berkel|ritter/, 'slicer'],
    [/inductie/, 'magnet'], [/gas/, 'flame'], [/elektrisch koken|keramisch koken/, 'heat'], [/warmtebron/, 'flame'], [/antiaanbak|aluminium/, 'egg'],
    [/plaatstaal/, 'disc'], [/roestvrij/, 'sparkle'], [/gietijzer/, 'casserole'], [/materia/, 'layers'], [/poffertje|pannenkoek/, 'pancake'], [/paella/, 'pan'], [/vis/, 'fish'],
    [/grill|plancha|tosti|wafel/, 'grill'], [/wok|wadjan/, 'wok'], [/soep|kookpan|pasta|stoom|asperge|mossel|snelkook|cataplana|sappan|jam/, 'pot'],
    [/frituur/, 'fryer'], [/saus|steel|melk|bain-marie|fondue/, 'saucepan'], [/braad|faitout|tajine/, 'casserole'], [/downdraft|special/, 'star'], [/koekenpan|bakpan|hapjes|pannen/, 'pan'],
    [/broodroost/, 'toaster'], [/broodbak/, 'bread'], [/foodprocessor|magimix|accessoire/, 'leaf'], [/waterkoker|teamaker/, 'kettle'], [/standmixer|kitchenaid|bakery|ankarsrum/, 'mixer'],
    [/handmixer|mixer|bamix/, 'whisk'], [/slowcook|multicook/, 'timer'], [/droog/, 'apple'], [/blender/, 'blender'], [/juicer|citrus|sapcentrifuge/, 'citrus'], [/ijs/, 'icecream'],
    [/sous-vide|vacu/, 'thermo'], [/kamado|bastard|green egg|bbq|merken vergelijken/, 'flame'], [/volautoma/, 'robot'], [/halfautoma/, 'hand'], [/koffiemolen/, 'grinder'],
    [/koffie/, 'coffee'], [/kassa|productgroep/, 'receipt'], [/belangrijk/, 'alert'], [/algemeen/, 'list'], [/specifiek/, 'target']];
  const picFor = text => { const t = String(text || '').toLowerCase(); const m = PICS.find(([re]) => re.test(t)); return m ? m[1] : null; };
  const picIcon = (nlText, i) => { const p = picFor(nlText);
    return `<span class="icon">${p ? IC(p) : `<b class="num">${i + 1}</b>`}</span>`; };
  const icon = (id, i) => { const c = PALETTE[i % PALETTE.length]; return `<span class="icon tint" style="--tint:${c}">${IC(GROUP_ICON[id] || 'grid')}</span>`; };
  const chev = '<span class="chev" aria-hidden="true"></span>';
  const backBtn = () => `<button class="back" onclick="history.length>1?history.back():location.hash='#/'" aria-label="${L('Terug', 'Back')}">${IC('back')}</button>`;
  const top = title => `<div class="top">${backBtn()}<div class="title">${esc(title || '')}</div></div>`;
  const ROLE = { employee: () => L('Medewerker', 'Employee'), boss: () => L('Baas', 'Boss'), developer: () => 'Developer' };
  const roleName = r => (ROLE[r] || ROLE.employee)();
  const RANK = { developer: 3, boss: 2, employee: 1 };
  const rankBadge = r => `<span class="rank rank-${esc(r || 'employee')}">${'★'.repeat(RANK[r] || 1)} ${esc(roleName(r))}</span>`;
  const byRank = list => [...list].sort((a, b) => (RANK[b.role] || 1) - (RANK[a.role] || 1) || a.name.localeCompare(b.name));
  // accounts grouped under their rank: developer, boss, employee
  const rankGroups = (list, render) => ['developer', 'boss', 'employee'].map(r => { const l = list.filter(a => (a.role || 'employee') === r).sort((a, b) => a.name.localeCompare(b.name));
    return l.length ? `<div class="rank-head">${rankBadge(r)}<span class="faint small">${l.length}</span></div>${render(l)}` : ''; }).join('');
  const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const avatar = (a, size = 44) => a && a.photo
    ? `<img class="avatar" src="${esc(a.photo)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${esc(initials(a && a.name))}</span>`;
  function source(src) {
    if (!src) return '';
    if (src.kind === 'booklet') return `<div class="source">${L('Bron: informatieboekje, p.', 'Source: info booklet, p.')} ${esc(src.page)}</div>`;
    if (src.kind === 'website') return `<div class="source">${L('Bron', 'Source')}: <a href="${esc(src.url)}" target="_blank" rel="noopener">kookwinkel.nl</a>${src.checkedOn ? `, ${L('gecontroleerd', 'checked')} ${esc(fmtDate(src.checkedOn))}` : ''}${LANG === 'en' ? ' (translated from Dutch)' : ''}</div>`;
    return '';
  }
  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
  }
  const productImg = (p, v) => (v || p.variants[0]).image;
  const outCount = p => p.variants.filter(v => S.isOut(v.id)).length;
  const isManager = () => S.isManager(S.account);

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
    if (!RAW) {
      let sage;
      [RAW, B, Q, TASKS, sage] = await Promise.all([getJSON('data/catalog.json'), getJSON('data/booklet.json').catch(() => ({ groups: [] })),
        getJSON('data/quiz.json').then(q => q.quizzes).catch(() => []), getJSON('data/tasks.json').catch(() => null), getJSON('data/sage.json').catch(() => null)]);
      if (sage) FOLDERS[sage.brandID] = sage;
    }
    if (LANG === 'en' && !EN) EN = await getJSON('data/catalog.en.json').catch(() => ({}));
    C = LANG === 'en' ? translate(RAW) : RAW;
    document.documentElement.lang = LANG;
    if (window.Diagrams) Diagrams.setLang(LANG);
    idx.cat = Object.fromEntries(C.categories.map(c => [c.id, c]));
    idx.type = Object.fromEntries(C.typeGuides.map(t => [t.id, t]));
    idx.brand = Object.fromEntries(C.brands.map(b => [b.id, b]));
    idx.product = Object.fromEntries(C.products.map(p => [p.id, p]));
    idx.mm = Object.fromEntries(C.mismatches.map(m => [m.id, m]));
    idx.group = Object.fromEntries(B.groups.map(g => [g.id, g]));
    idx.groupOfCat = Object.fromEntries(B.groups.filter(g => g.categoryID).map(g => [g.categoryID, g]));
    idx.variant = {}; idx.ean = {};
    C.products.forEach(p => p.variants.forEach(v => {
      idx.variant[v.id] = { p, v };
      if (v.ean) idx.ean[String(v.ean).replace(/^0+/, '')] = { p, v };
    }));
    idx.search = C.products.map(p => ({ p, hay: norm([p.name, idx.brand[p.brandID]?.name, ...p.typeIDs.map(t => idx.type[t]?.name),
      ...p.variants.flatMap(v => [v.colorName, v.ean, v.articleNumber])].join(' ')) }));
    // folder models <-> app products, matched on the article number (e.g. SES875BSS2EEU1 starts with SES875)
    idx.folderOf = {}; idx.productOfModel = {};
    Object.values(FOLDERS).forEach(F => F.models.forEach(m => {
      const p = C.products.find(p => p.brandID === F.brandID && p.variants.some(v => String(v.articleNumber || '').startsWith(m.code)));
      if (p) { idx.folderOf[p.id] = m; idx.productOfModel[m.code] = p; }
    }));
    idx.brandSearch = C.brands.map(b => ({ b, hay: norm(b.name) }));
    idx.topics = B.groups.flatMap(g => g.topics.map(t => ({ g, t, hay: norm([LT(t.title), ...(t.summary || []).map(LT), ...t.blocks.map(blockText)].join(' ')) })));
  }
  const blockText = b => [LT(b.text), ...(b.items || []).flatMap(function f(i) { return [LT(i.text), ...(i.children || []).flatMap(f)]; }),
    ...(b.names || []), ...(b.cards || []).flatMap(c => [LT(c.title), ...c.rows.flatMap(r => [LT(r.label), LT(r.value)])])].join(' ');
  const productsOfType = t => C.products.filter(p => p.typeIDs.includes(t));
  const typesOfCat = c => C.typeGuides.filter(t => t.categoryID === c);
  const productsOfCat = c => C.products.filter(p => p.typeIDs.some(t => idx.type[t]?.categoryID === c));
  const groupOfProduct = p => { const t = p && p.typeIDs.map(id => idx.type[id]).find(Boolean); return t ? idx.groupOfCat[t.categoryID] : null; };
  const openMismatches = ids => (ids || []).map(id => idx.mm[id]).filter(m => m && m.status !== 'resolved');
  const openMismatchCount = () => C.mismatches.filter(m => m.status !== 'confirmed' && m.status !== 'resolved').length;
  const QUIZ_PRODUCT = { 'profitec-go-2': 'profitec-go-2-0', 'sage-oracle-jet': 'sage-the-oracle-jet' };

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
  function outList() {
    const list = S.outList().map(f => ({ f, x: idx.variant[f.variantID] })).filter(o => o.x);
    return list.length ? `<div class="list">${list.map(({ f, x }) => `<a class="row" href="#/p/${esc(x.p.id)}?v=${esc(x.v.id)}"><img class="thumb" src="${esc(x.v.image)}" alt="">
        <div class="grow"><div class="name">${esc(x.p.name)}</div><div class="sub">${esc(x.v.colorName)}${f.comment ? ' · ' + esc(f.comment) : ''}</div>
        <div class="sub faint">${esc(f.author)} · ${esc(fmtTime(f.updatedAt))}</div></div><span class="flagdot">${IC('flag')}</span></a>`).join('')}</div>` : '';
  }
  function outOfStockSection() {
    const n = S.outList().filter(f => idx.variant[f.variantID]).length;
    return n ? `<div class="section-title"><h2>${L('Niet op voorraad', 'Out of stock')}</h2><span class="muted small">${n}</span></div>${outList()}` : '';
  }

  // ---------- gate: team code, first developer account, login ----------
  let gate = { selected: null, error: '', busy: false };
  function gateView() {
    if (!S.hasTeamCode || S.state.error === 'teamcode') return teamCodeView();
    if (S.state.error === 'setup') return `<div class="hero"><h1>${L('Bijna klaar', 'Almost ready')}</h1></div>
      <div class="card"><p>${L('De accounts zijn nog niet ingesteld in de database. Vraag de developer om het accounts-script in Supabase uit te voeren.', 'Accounts are not set up in the database yet. Ask the developer to run the accounts script in Supabase.')}</p>
      <button class="btn block" data-act="retry">${L('Opnieuw proberen', 'Try again')}</button></div>`;
    if (!S.state.accountsLoaded) {
      if (!navigator.onLine) return `<div class="hero"><h1>${L('Even internet nodig', 'Internet needed once')}</h1></div><div class="card"><p>${L('Om de eerste keer in te loggen heeft de app internet nodig. Daarna werkt hij ook zonder.', 'To log in the first time the app needs internet. After that it also works without.')}</p><button class="btn block" data-act="retry">${L('Opnieuw proberen', 'Try again')}</button></div>`;
      if (!gate.loading) { gate.loading = true; S.loadAccounts().catch(e => { S.state.error = e.message; }).finally(() => { gate.loading = false; route(); }); }
      return `<p class="loading">${L('Laden…', 'Loading…')}</p>`;
    }
    if (!S.accounts.length) return firstRunView();
    return loginView();
  }
  const langSwitch = () => `<div class="seg lang"><button class="${LANG === 'nl' ? 'on' : ''}" data-act="lang" data-l="nl">NL</button><button class="${LANG === 'en' ? 'on' : ''}" data-act="lang" data-l="en">EN</button></div>`;
  function teamCodeView() {
    return `<div class="hero"><div class="eyebrow">Kookwinkel Oldenhof</div><h1>${L('Welkom', 'Welcome')}</h1>
        <p class="muted">${L('Vul de teamcode in die je van de bedrijfsleider hebt gekregen. Dat hoeft maar één keer.', 'Enter the team code you got from the manager. You only need to do this once.')}</p>${langSwitch()}</div>
      <form data-act="team" class="card">
        ${S.state.error === 'teamcode' ? `<p class="errtext">${L('Deze teamcode klopt niet.', 'This team code is not right.')}</p>` : ''}
        <input class="field" name="c" type="text" placeholder="${L('Teamcode', 'Team code')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" style="margin-bottom:10px">
        <button class="btn block">${L('Doorgaan', 'Continue')}</button></form>`;
  }
  function firstRunView() {
    return `<div class="hero"><h1>${L('Account aanmaken', 'Create account')}</h1>
        <p class="muted">${L('Welkom! Maak eerst het developer-account aan. Daarmee kun je later accounts voor de baas en medewerkers maken.', 'Welcome! First create the developer account. With it you can later create accounts for the boss and employees.')}</p></div>
      ${accountForm(null, ['developer'], 'firstrun')}`;
  }
  function loginView() {
    if (gate.adding) return addAccountGateView();
    const sel = S.accounts.find(a => a.id === gate.selected);
    return `<div class="hero"><div class="eyebrow">Kookwinkel Oldenhof</div><h1>${L('Wie ben je?', 'Who are you?')}</h1>${langSwitch()}</div>
      ${rankGroups(S.accounts, l => `<div class="people">${l.map(a => personBtn(a, 'pick')).join('')}</div>`)}
      ${sel ? `<form data-act="login" class="card" style="margin-top:14px"><h3>${L('Pincode van', 'PIN for')} ${esc(sel.name)}</h3>
        <input class="field pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" placeholder="••••" style="margin:12px 0">
        <label class="check"><input type="checkbox" name="stay" checked> ${L('Ingelogd blijven op dit toestel', 'Stay logged in on this device')}</label>
        ${gate.error ? `<p class="errtext">${esc(gate.error)}</p>` : ''}
        <button class="btn block" ${gate.busy ? 'disabled' : ''}>${L('Inloggen', 'Log in')}</button></form>` : ''}
      <button class="btn ghost block" data-act="gateadd" style="margin-top:18px">+ ${L('Account toevoegen', 'Add account')}</button>
      <p class="faint small" style="text-align:center;margin-top:8px">${L('Een baas of developer bevestigt met zijn of haar eigen pincode.', 'A boss or developer confirms with their own PIN.')}</p>`;
  }
  const personBtn = (a, act, on) => `<button class="person ${(on ?? a.id === gate.selected) ? 'on' : ''}" data-act="${act}" data-id="${esc(a.id)}">
        ${avatar(a, 64)}<div class="name">${esc(a.name)}</div>${rankBadge(a.role)}</button>`;
  // adding an account from the login screen: step 1 a boss/developer confirms, step 2 the account form
  function addAccountGateView() {
    const back = `<button class="btn ghost block" data-act="gatecancel" style="margin-top:12px">${L('Annuleer', 'Cancel')}</button>`;
    if (gate.adding.token) {
      const m = gate.adding.manager;
      return `<div class="hero"><h1>${L('Nieuw account', 'New account')}</h1><p class="muted small">${L('Bevestigd door', 'Confirmed by')} ${esc(m.name)} (${esc(roleName(m.role))})</p></div>
        ${accountForm(null, S.assignable(m.role), 'gate')}${back}`;
    }
    const managers = S.accounts.filter(a => a.role !== 'employee');
    const sel = managers.find(a => a.id === gate.adding.managerID);
    return `<div class="hero"><h1>${L('Account toevoegen', 'Add account')}</h1><p class="muted">${L('Wie geeft toestemming? Alleen een baas of developer kan een account maken.', 'Who gives permission? Only a boss or developer can create an account.')}</p></div>
      <div class="people">${managers.map(a => personBtn(a, 'gatemgr', a.id === gate.adding.managerID)).join('')}</div>
      ${sel ? `<form data-act="gatemgr" class="card" style="margin-top:14px"><h3>${L('Pincode van', 'PIN for')} ${esc(sel.name)}</h3>
        <input class="field pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="••••" style="margin:12px 0">
        ${gate.error ? `<p class="errtext">${esc(gate.error)}</p>` : ''}
        <button class="btn block" ${gate.busy ? 'disabled' : ''}>${L('Bevestig', 'Confirm')}</button></form>` : ''}${back}`;
  }

  // ---------- account form (first run, new, edit) ----------
  let formPhoto = null;   // data URL picked in the form
  function accountForm(acc, roles, mode) {
    formPhoto = acc ? acc.photo || null : null;
    const role = acc ? acc.role : roles[0];
    return `<form data-act="account" data-mode="${mode}" data-id="${esc(acc ? acc.id : '')}" class="card">
      <div class="photo-pick"><label><span id="photoPrev">${avatar(acc ? { name: acc.name, photo: acc.photo } : { name: '+' }, 84)}</span>
        <input type="file" accept="image/*" name="photo" hidden><span class="small accent-text">${L('Foto kiezen (optioneel)', 'Choose photo (optional)')}</span></label>
        <button type="button" class="small faint" data-act="nophoto">${L('Foto verwijderen', 'Remove photo')}</button></div>
      <label class="lbl">${L('Naam', 'Name')}</label><input class="field" name="name" value="${esc(acc ? acc.name : '')}" autocomplete="name">
      <label class="lbl">${L('Werknummer', 'Work ID number')}</label><input class="field" name="work" value="${esc(acc ? acc.workID : '')}" inputmode="numeric">
      <label class="lbl">${L('Niveau', 'Level')}</label>
      ${roles.length > 1 ? `<select class="field" name="role">${roles.map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${esc(roleName(r))}</option>`).join('')}</select>`
        : `<input type="hidden" name="role" value="${esc(role)}"><div class="field static">${esc(roleName(role))}</div>`}
      <label class="lbl">${acc ? L('Nieuwe pincode (leeg = niet wijzigen)', 'New PIN (empty = keep)') : L('Pincode (4 cijfers)', 'PIN (4 digits)')}</label>
      <input class="field pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password">
      <label class="lbl">${L('Herhaal pincode', 'Repeat PIN')}</label>
      <input class="field pin" name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password">
      <p class="small faint">${L('De pincode wordt alleen versleuteld bewaard. Niemand kan hem teruglezen.', 'The PIN is only stored encrypted. Nobody can read it back.')}</p>
      <p class="errtext" id="formErr"></p>
      <button class="btn block">${L('Bewaar', 'Save')}</button></form>`;
  }
  function resizePhoto(file) {
    return new Promise((ok, bad) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const side = 256, s = Math.max(side / img.width, side / img.height);
        const c = document.createElement('canvas'); c.width = side; c.height = side;
        const w = img.width * s, h = img.height * s;
        c.getContext('2d').drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = bad; img.src = url;
    });
  }
  const ERR = {
    wrong_pin: () => L('Onjuiste pincode.', 'Wrong PIN.'),
    locked: () => L('Te vaak een verkeerde pincode. Probeer het over 5 minuten opnieuw.', 'Too many wrong PINs. Try again in 5 minutes.'),
    forbidden: () => L('Dit mag je niet met jouw niveau.', 'Your level does not allow this.'),
    exists: () => L('Er bestaat al een account. Log in.', 'An account already exists. Please log in.'),
    invalid: () => L('Controleer naam en pincode (4 cijfers).', 'Check the name and PIN (4 digits).'),
    login: () => L('Je bent uitgelogd. Log opnieuw in.', 'You have been logged out. Please log in again.'),
    unknown: () => L('Account niet gevonden.', 'Account not found.'),
    teamcode: () => L('Teamcode klopt niet.', 'Team code is wrong.'),
    setup: () => L('De accounts zijn nog niet ingesteld in de database.', 'Accounts are not set up in the database yet.'),
    offline: () => L('Hiervoor is internet nodig.', 'This needs internet.')
  };
  const errText = e => (ERR[e] ? ERR[e]() : L('Er ging iets mis: ', 'Something went wrong: ') + e);

  // ---------- side menu ----------
  function menuHTML() {
    const a = S.account; const n = openMismatchCount(); const outs = S.outList().filter(f => idx.variant[f.variantID]).length;
    return `<div class="menu-backdrop" data-act="closemenu"></div><nav class="menu-panel" aria-label="Menu">
      <div class="menu-head">${avatar(a, 54)}<div><div class="name">${esc(a?.name)}</div><div style="margin-top:4px">${rankBadge(a?.role)}</div></div></div>
      <div class="menu-rows">
        <a class="mrow" href="#/check"><i>${IC('alert')}</i><span>${L('Controle', 'Check')}</span>${n ? `<b class="badge">${n}</b>` : ''}</a>
        <a class="mrow" href="#/notities"><i>${IC('pencil')}</i><span>${L('Notities', 'Notes')}</span></a>
        <a class="mrow" href="#/voorraad"><i>${IC('flag')}</i><span>${L('Niet op voorraad', 'Out of stock')}</span>${outs ? `<b class="badge">${outs}</b>` : ''}</a>
        ${isManager() ? `<a class="mrow" href="#/rapport"><i>${IC('report')}</i><span>${L('Rapport', 'Report')}</span>${S.allIssues().filter(i => !i.resolved).length ? `<b class="badge">${S.allIssues().filter(i => !i.resolved).length}</b>` : ''}</a>
        <a class="mrow" href="#/accounts"><i>${IC('users')}</i><span>${L('Accounts', 'Accounts')}</span></a>` : ''}
      </div>
      <div class="small muted mlabel">${L('Weergave', 'Appearance')}</div>
      <div class="seg">${[['system', L('Systeem', 'System')], ['light', L('Licht', 'Light')], ['dark', L('Donker', 'Dark')]].map(([k, t]) => `<button class="${THEME === k ? 'on' : ''}" data-act="theme" data-t="${k}">${t}</button>`).join('')}</div>
      <div class="small muted mlabel">${L('Taal', 'Language')}</div>
      <div class="seg"><button class="${LANG === 'nl' ? 'on' : ''}" data-act="lang" data-l="nl">Nederlands</button><button class="${LANG === 'en' ? 'on' : ''}" data-act="lang" data-l="en">English</button></div>
      <div class="menu-rows">
        <a class="mrow" href="#/over"><i>${IC('info')}</i><span>${L('Over de app', 'About')}</span></a>
        <button class="mrow neg" data-act="logout"><i>${IC('logout')}</i><span>${L('Uitloggen', 'Log out')}</span></button>
      </div></nav>`;
  }
  function openMenu() { const m = document.getElementById('menu'); m.innerHTML = menuHTML(); m.classList.add('open'); }
  function closeMenu() { document.getElementById('menu').classList.remove('open'); }

  // ---------- dialog ----------
  function openDialog(html) { const d = document.getElementById('dlg'); d.innerHTML = `<div class="dlg-backdrop" data-act="closedlg"></div><div class="dlg-card">${html}</div>`; d.classList.add('open'); setTimeout(() => d.querySelector('input,textarea')?.focus(), 50); }
  function closeDialog() { document.getElementById('dlg').classList.remove('open'); }

  // ---------- views ----------
  const views = {};

  views.home = () => {
    const a = S.account; const n = openMismatchCount();
    const h = new Date().getHours();
    const greet = h >= 5 && h < 12 ? L('Goedemorgen', 'Good morning') : h >= 12 && h < 18 ? L('Goedemiddag', 'Good afternoon') : L('Goedenavond', 'Good evening');
    const first = a ? String(a.name).split(' ')[0] : '';
    return `<section class="hero-card">
        <div class="homebar"><button class="avbtn" data-act="menu" aria-label="${esc(a?.name || 'Menu')}">${avatar(a, 48)}</button>
          <div class="who"><div class="who-greet">${esc(greet)}</div><div class="who-name">${esc(first || 'Oldenhof')}</div></div>
          <button class="iconbtn lang-btn" data-act="lang" data-l="${LANG === 'nl' ? 'en' : 'nl'}" aria-label="${L('Switch to English', 'Naar Nederlands')}">${LANG === 'nl' ? 'EN' : 'NL'}</button>
          <button class="iconbtn" data-act="menu" aria-label="Menu">${IC('menu')}${n ? '<i class="dot"></i>' : ''}</button></div>
        <h1 class="hero-q">${L('Wat wil de klant vandaag weten?', 'What does the customer want to know today?')}</h1>
        <a class="search" href="#/zoek">${IC('search')}<span class="faint">${L('Zoek op naam, merk of barcode', 'Search by name, brand or barcode')}</span></a>
      </section>
      ${S.state.error ? `<div class="card tight small"><span class="status-dot off"></span>${esc(syncLabel())}</div>` : ''}
      ${outOfStockSection()}
      <h2>${L('Afdelingen', 'Departments')}</h2>
      <div class="tiles">${B.groups.map((g, i) => {
        const np = g.categoryID ? productsOfCat(g.categoryID).length : 0;
        return `<a class="tile" href="#/g/${esc(g.id)}"><div class="tile-top">${icon(g.id, i)}<span class="tile-arrow">${IC('arrow')}</span></div><div><div class="label">${esc(LT(g.title))}</div><div class="count">${np ? `${np} ${L('producten', 'products')} · ` : ''}${g.topics.length} ${g.topics.length > 1 ? L('onderwerpen', 'topics') : L('onderwerp', 'topic')}</div></div></a>`; }).join('')}</div>
      <div class="section-title"><h2>${L('Merken', 'Brands')}</h2><span class="muted small">${L('overzicht en vergelijken', 'overview and compare')}</span></div>
      <div class="chips">${C.brands.map(b => ({ b, n: C.products.filter(p => p.brandID === b.id).length })).filter(x => x.n || FOLDERS[x.b.id]).sort((x, y) => y.n - x.n)
        .map(({ b, n }) => `<a class="chip" href="#/b/${esc(b.id)}">${esc(b.name)} <span class="faint">${n}</span></a>`).join('')}</div>
      <div class="section-title"><h2>${L('Alle producten', 'All products')}</h2><a href="#/zoek">${L('Zoeken', 'Search')} →</a></div>
      <div class="shelf">${C.products.map(p => `<a class="shelf-item" href="#/p/${esc(p.id)}"><div class="shelf-img"><img loading="lazy" src="${esc(productImg(p))}" alt="">${outCount(p) ? `<span class="flagdot corner">${IC('flag')}</span>` : ''}</div><div class="small">${esc(p.name)}</div></a>`).join('')}</div>
      <p class="faint small" style="text-align:center;margin-top:24px">${L('Werkt zonder internet · Productinformatie van kookwinkel.nl en het informatieboekje', 'Works offline · Product information from kookwinkel.nl and the information booklet')} · ${esc(fmtDate(C.generatedOn))}</p>`;
  };

  // department = booklet group, with the catalog category of the same subject on the same page
  views.group = ([id], q) => {
    const g = idx.group[id]; if (!g) return notFound();
    const c = g.categoryID ? idx.cat[g.categoryID] : null;
    const prods = c ? productsOfCat(c.id) : [];
    const brandIDs = [...new Set(prods.map(p => p.brandID))].filter(b => idx.brand[b]).sort((a, b) => idx.brand[a].name.localeCompare(idx.brand[b].name));
    const bf = q.get('merk');
    const shown = bf ? prods.filter(p => p.brandID === bf) : prods;
    const types = c ? typesOfCat(c.id) : [];
    return `${top('')}<div class="hero"><div class="eyebrow">${esc(LT(g.subtitle))}</div><h1>${esc(LT(g.title))}</h1></div>
      ${types.length ? `<h2>${esc(c.groupingLabel || L('Soorten', 'Types'))}</h2>
        <div class="list">${types.map((t, i) => `<a class="row" href="#/t/${esc(t.id)}">${icon(t.id, i)}<div class="grow"><div class="name">${esc(t.name)}</div>
          <div class="sub">${esc(t.oneLiner?.text || t.subtitle || '')}</div><div class="sub faint">${productsOfType(t.id).length} ${L('producten', 'products')}</div></div>${chev}</a>`).join('')}</div>` : ''}
      ${c && c.advice?.length ? `<div class="card"><h3>${L('Advies bij verkoop', 'Sales advice')}</h3><ul class="bullets">${c.advice.map(a => `<li>${esc(a.text)}</li>`).join('')}</ul>${source(c.advice[0].source)}</div>` : ''}
      <h2>${L('Theorie uit het boekje', 'Theory from the booklet')}</h2>
      <div class="tiles">${g.topics.map((t, i) => `<a class="tile" href="#/g/${esc(id)}/${esc(t.id)}">${picIcon(t.title.nl, i)}<div><div class="label">${esc(LT(t.title))}</div>
        <div class="count">${esc(pageLabel(t))}</div></div></a>`).join('')}</div>
      ${prods.length ? `<div class="section-title"><h2>${L('Producten', 'Products')}</h2><span class="muted small">${shown.length}</span></div>
        <div class="chips"><a class="chip ${!bf ? 'on' : ''}" href="#/g/${esc(id)}">${L('Alle', 'All')}</a>${brandIDs.map(b => `<a class="chip ${bf === b ? 'on' : ''}" href="#/g/${esc(id)}?merk=${esc(b)}">${esc(idx.brand[b].name)}</a>`).join('')}</div>
        <div class="list">${shown.map(p => productRow(p)).join('')}</div>` : ''}`;
  };
  const pageLabel = t => { const p = [...(t.pages || [])].sort((a, b) => a - b); return p.length ? (p[0] === p[p.length - 1] ? `p. ${p[0]}` : `p. ${p[0]}-${p[p.length - 1]}`) : ''; };
  function itemsHTML(items, ordered) {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} class="${ordered ? 'numbered' : 'bullets'}">${items.map(i => `<li>${md(LT(i.text))}${i.children?.length ? itemsHTML(i.children) : ''}</li>`).join('')}</${tag}>`;
  }
  function blockHTML(b) {
    switch (b.kind) {
      case 'heading': return `<h3 class="bh">${esc(LT(b.text))}</h3>`;
      case 'paragraph': return `<p>${md(LT(b.text))}</p>`;
      case 'note': return `<div class="notebox">${md(LT(b.text))}</div>`;
      case 'bullets': return itemsHTML(b.items || []);
      case 'numbered': return itemsHTML(b.items || [], true);
      case 'brands': return `<div class="pills" style="margin:10px 0">${(b.names || []).map(n => `<span class="pill">${esc(n)}</span>`).join('')}</div>`;
      case 'figure': return window.Diagrams && Diagrams.hasFigure(b.image)
        ? `${Diagrams.figure(b.image)}<details class="fig-orig"><summary>${L('Originele afbeelding uit het boekje', 'Original picture from the booklet')}</summary><figure class="fig"><img src="img/booklet/${esc(b.image)}.webp" alt="${esc(LT(b.text))}" loading="lazy"><figcaption class="small muted">${esc(LT(b.text))}</figcaption></figure></details>`
        : `<figure class="fig"><img src="img/booklet/${esc(b.image)}.webp" alt="${esc(LT(b.text))}" loading="lazy"><figcaption class="small muted">${esc(LT(b.text))}${LANG === 'en' ? ' (labels in Dutch, as in the booklet)' : ''}</figcaption></figure>`;
      case 'cards': return `<div class="bcards">${(b.cards || []).map(c => `<div class="bcard"><div class="name">${esc(LT(c.title))}</div>${c.subtitle ? `<div class="small muted">${esc(LT(c.subtitle))}</div>` : ''}
        <dl class="kv left">${c.rows.map(r => `<dt>${esc(LT(r.label))}</dt><dd>${md(LT(r.value))}</dd>`).join('')}</dl></div>`).join('')}</div>`;
      default: return '';
    }
  }
  // a topic is split into parts at each heading; text before the first heading is the "explanation" part
  function partsOf(t) {
    const parts = []; let cur = { head: null, blocks: [] };
    t.blocks.forEach(b => { if (b.kind === 'heading') { if (cur.head || cur.blocks.length) parts.push(cur); cur = { head: b, blocks: [] }; } else cur.blocks.push(b); });
    parts.push(cur);
    return parts.filter(p => p.head || p.blocks.length);
  }
  const partTitle = (p, t) => p.head ? LT(p.head.text) : L('Uitleg', 'Explanation');
  const partTitleNL = (p, t) => p.head ? p.head.text.nl : t.title.nl;
  // the booklet text, but each paragraph / list item in its own small box
  function boxedHTML(b) {
    switch (b.kind) {
      case 'paragraph': return `<div class="pbox">${md(LT(b.text))}</div>`;
      case 'bullets': return `<div class="bgrid">${(b.items || []).map(i => `<div class="bitem"><i></i><div>${md(LT(i.text))}${i.children?.length ? itemsHTML(i.children) : ''}</div></div>`).join('')}</div>`;
      case 'numbered': return `<div class="steps">${(b.items || []).map((i, k) => `<div class="step"><b>${k + 1}</b><div>${md(LT(i.text))}${i.children?.length ? itemsHTML(i.children) : ''}</div></div>`).join('')}</div>`;
      case 'brands': return `<div class="brandbox"><div class="small muted">${L('Merken', 'Brands')}</div><div class="pills">${(b.names || []).map(n => `<span class="pill">${esc(n)}</span>`).join('')}</div></div>`;
      default: return blockHTML(b);
    }
  }
  views.topic = ([gid, tid]) => {
    const g = idx.group[gid]; const t = g && g.topics.find(x => x.id === tid); if (!t) return notFound();
    const parts = partsOf(t);
    const head = `${top(LT(g.title))}<div class="hero"><div class="eyebrow">${esc(LT(g.title))} · ${esc(pageLabel(t))}</div><h1>${esc(LT(t.title))}</h1>${t.subtitle ? `<p class="muted">${esc(LT(t.subtitle))}</p>` : ''}</div>`;
    const keys = t.summary?.length ? `<h2 style="margin-top:4px">${L('In het kort', 'At a glance')}</h2>
      <div class="keys">${t.summary.map((x, k) => `<div class="key"><b>${k + 1}</b><div>${md(LT(x))}</div></div>`).join('')}</div>` : '';
    const src = `<div class="source">${L('Bron: informatieboekje Kookwinkel Oldenhof Maastricht', 'Source: Kookwinkel Oldenhof Maastricht information booklet')}, ${esc(pageLabel(t))} · ${L('nog niet vergeleken met de website', 'not yet compared with the website')}</div>`;
    const pic = window.Diagrams ? Diagrams.topic(t.id) : '';
    const picHTML = pic ? `<h2>${L('In één beeld', 'In one picture')}</h2>${pic}` : '';
    if (parts.length <= 1) return `${head}${keys}${picHTML}<h2>${L('Uitleg', 'Explanation')}</h2>${(parts[0]?.blocks || []).map(boxedHTML).join('')}${src}`;
    return `${head}${keys}${picHTML}<h2>${L('Kies een onderdeel', 'Choose a part')}</h2>
      <div class="tiles parts">${parts.map((p, k) => `<a class="tile" href="#/g/${esc(gid)}/${esc(tid)}/${k + 1}">${picIcon(partTitleNL(p, t), k)}<div class="label">${esc(partTitle(p, t))}</div></a>`).join('')}</div>${src}`;
  };
  views.part = ([gid, tid, n]) => {
    const g = idx.group[gid]; const t = g && g.topics.find(x => x.id === tid); if (!t) return notFound();
    const parts = partsOf(t); const k = (+n || 1) - 1; const p = parts[k]; if (!p) return notFound();
    const nav = (d, label) => parts[k + d] ? `<a class="btn ghost" href="#/g/${esc(gid)}/${esc(tid)}/${k + d + 1}">${label}</a>` : '<span></span>';
    return `${top(LT(t.title))}<div class="hero part-hero">${picIcon(partTitleNL(p, t), k)}<div><div class="eyebrow">${esc(LT(t.title))} · ${k + 1}/${parts.length}</div><h1>${esc(partTitle(p, t))}</h1></div></div>
      ${window.Diagrams && p.head ? Diagrams.part(t.id, p.head.text.nl) : ''}${p.blocks.map(boxedHTML).join('') || `<div class="empty">${L('Zie de onderdelen hieronder.', 'See the parts below.')}</div>`}
      <div class="partnav">${nav(-1, '← ' + L('Vorige', 'Previous'))}${nav(1, L('Volgende', 'Next') + ' →')}</div>
      <div class="source">${L('Bron: informatieboekje, p.', 'Source: information booklet, p.')} ${esc([...new Set(p.blocks.concat(p.head || []).map(b => b.page).filter(Boolean))].join(', ') || pageLabel(t))}</div>`;
  };

  views.category = ([id]) => {
    const g = idx.groupOfCat[id];
    if (g) { setTimeout(() => location.replace('#/g/' + g.id)); return ''; }
    const c = idx.cat[id]; if (!c) return notFound();
    return `${top('')}<div class="hero"><h1>${esc(c.name)}</h1></div><div class="list">${productsOfCat(id).map(p => productRow(p)).join('')}</div>`;
  };

  views.type = ([id]) => {
    const t = idx.type[id]; if (!t) return notFound();
    const prods = productsOfType(id);
    const brands = [...new Set([...(t.brandIDs || []), ...prods.map(p => p.brandID)])].filter(b => idx.brand[b]);
    const g = idx.groupOfCat[t.categoryID];
    return `${top(g ? LT(g.title) : idx.cat[t.categoryID]?.name)}<div class="hero"><div class="eyebrow">${esc(t.subtitle || '')}</div><h1>${esc(t.name)}</h1>
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

  // ---------- brand overview, compare ----------
  const cmp = new Set();                 // items picked for comparing: 'p:<productID>' or 'm:<brand>:<model code>'
  const cmpBar = () => cmp.size ? `<div class="cmpbar"><span>${cmp.size} ${L('gekozen', 'chosen')}</span><button class="pill" data-act="cmpclear">${L('Wis', 'Clear')}</button>
      <a class="btn" href="#/vergelijk?i=${encodeURIComponent([...cmp].join(','))}" ${cmp.size < 2 ? 'aria-disabled="true"' : ''}>${IC('compare')} ${L('Vergelijk', 'Compare')}</a></div>` : '';
  const pick = key => `<button class="pick ${cmp.has(key) ? 'on' : ''}" data-act="pick" data-k="${esc(key)}" aria-pressed="${cmp.has(key)}" aria-label="${L('Kies om te vergelijken', 'Pick to compare')}">${IC('check')}</button>`;
  const pickRow = (p, sub) => `<div class="pickrow">${productRow(p, sub)}${pick('p:' + p.id)}</div>`;
  const FW = (F, v) => LANG === 'en' && typeof v === 'string' && F.words[v] ? F.words[v] : v;   // folder word in the app language
  const folderCell = (F, v) => v === true ? `<span class="dg-yes">✓</span>` : v == null || v === false ? `<span class="faint">–</span>` : esc(FW(F, v));
  const levelOf = (F, id) => F.levels.find(l => l.id === id);
  function folderLevels(F, withPick) {
    return `<div class="levels">${F.levels.map((lv, i) => `<div class="level lv${i + 1}"><div class="level-h"><span class="level-n">${i + 1}</span><div><b>${esc(LT(lv.title))}</b><span>“${esc(LT(lv.motto))}”</span></div></div>
      <p class="level-q">${esc(LT(lv.quote))}</p>
      <div class="models">${F.models.filter(m => m.level === lv.id).map(m => { const p = idx.productOfModel[m.code]; const key = `m:${F.brandID}:${m.code}`;
        return `<div class="model"><a class="model-main" href="#/vergelijk?i=${encodeURIComponent(key)}"><b>${esc(m.name.replace(/^the /, ''))}</b><span>${esc(m.code)} · ${esc(FW(F, m.values.heating))} · ${esc(FW(F, m.values.milk))}</span>
          ${p ? `<span class="pill pos tiny">${L('In de app', 'In the app')}</span>` : ''}</a>${withPick ? pick(key) : ''}</div>`; }).join('')}</div></div>`).join('')}</div>`;
  }
  function folderFormula(F) {
    return `<div class="formula"><div class="small muted">${esc(LT(F.formulaTitle))}</div><div class="formula-row">${F.formula.map(f => `<div class="fstep"><span class="fn">${f.n}</span><b>${esc(f.value)}</b><span>${esc(LT(f.label))}</span></div>`).join('')}</div></div>`;
  }
  views.brand = ([typeID, brandID]) => {
    const b = idx.brand[brandID]; if (!b) return notFound();
    const t = typeID ? idx.type[typeID] : null;
    const prods = C.products.filter(p => p.brandID === brandID && (!t || p.typeIDs.includes(typeID)));
    const F = !t || t.id === 'halfautomaat' ? FOLDERS[brandID] : null;
    const types = t ? [t.id] : [...new Set(prods.map(p => p.typeIDs[0]))].filter(x => idx.type[x]);
    const byType = types.map(x => ({ t: idx.type[x], list: t ? prods : prods.filter(p => p.typeIDs[0] === x) })).filter(g => g.list.length);
    return `${top(t ? t.name : L('Merk', 'Brand'))}<div class="hero"><div class="eyebrow">${t ? esc(t.name) : L('Merkoverzicht', 'Brand overview')}</div><h1>${esc(b.name)}</h1>
        <div class="pills" style="margin-top:12px"><span class="pill">${prods.length} ${L('in de app', 'in the app')}</span>${F ? `<span class="pill">${F.models.length} ${L('modellen in de folder', 'models in the folder')}</span>` : ''}
        ${b.officialURL ? `<a class="pill accent" href="${esc(b.officialURL)}" target="_blank" rel="noopener">${L('Officiële website', 'Official website')} ↗</a>` : ''}</div></div>
      ${F ? `<h2>${L('Het hele assortiment in 3 niveaus', 'The whole range in 3 levels')}</h2><p class="muted small" style="margin-top:-6px">${esc(LT(F.title))}. ${L('Tik een machine aan, of kies er een paar met ✓ om te vergelijken.', 'Tap a machine, or pick a few with ✓ to compare.')}</p>
        ${folderLevels(F, true)}${folderFormula(F)}
        <a class="btn ghost block" href="#/folder/${esc(brandID)}" style="margin:12px 0 4px">${IC('compare')} ${L('Hele vergelijkingstabel', 'Full comparison table')}</a>
        <div class="source">${L('Bron', 'Source')}: ${esc(LT(F.source))}</div>` : ''}
      ${prods.length ? `<div class="section-title"><h2>${L('In de app', 'In the app')}</h2><span class="muted small">${L('✓ = vergelijken', '✓ = compare')}</span></div>
        ${byType.map(g => `${byType.length > 1 ? `<div class="small muted" style="margin:14px 2px 8px">${esc(g.t.name)}</div>` : ''}<div class="list">${g.list.map(p => pickRow(p)).join('')}</div>`).join('')}`
        : `<div class="empty">${L('Nog geen producten van dit merk in de app.', 'No products from this brand in the app yet.')}</div>`}
      ${cmpBar()}`;
  };
  // the whole folder as one table
  views.folder = ([brandID]) => {
    const F = FOLDERS[brandID]; if (!F) return notFound();
    const head = F.models.map(m => `<th class="lv${F.levels.findIndex(l => l.id === m.level) + 1}"><span>${esc(m.name.replace(/^the /, ''))}</span><small>${esc(m.code)}</small></th>`).join('');
    return `${top(idx.brand[brandID]?.name)}<div class="hero"><h1>${L('Vergelijkingstabel', 'Comparison table')}</h1><p class="muted small">${L('Veeg opzij voor alle machines. Kleur = niveau.', 'Swipe sideways for all machines. Colour = level.')}</p>
        <div class="pills" style="margin-top:10px">${F.levels.map((l, i) => `<span class="pill lvpill lv${i + 1}">${i + 1} · ${esc(LT(l.title))}</span>`).join('')}</div></div>
      <div class="ctable-wrap"><table class="ctable folder"><thead><tr><th class="rowh"></th>${head}</tr></thead><tbody>
        ${F.rows.map(r => `<tr><th class="rowh">${esc(LT(r.label))}</th>${F.models.map(m => `<td>${folderCell(F, m.values[r.key])}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="source">${L('Bron', 'Source')}: ${esc(LT(F.source))}</div>`;
  };
  // side-by-side comparison of products from the app and/or folder models
  views.compare = (_, q) => {
    const keys = (q.get('i') || '').split(',').filter(Boolean).slice(0, 4);
    const items = keys.map(k => { const [kind, a, c] = k.split(':');
      if (kind === 'p' && idx.product[a]) { const p = idx.product[a]; return { key: k, p, m: idx.folderOf[p.id], F: FOLDERS[p.brandID] }; }
      if (kind === 'm' && FOLDERS[a]) { const F = FOLDERS[a]; const m = F.models.find(x => x.code === c); if (m) return { key: k, m, F, p: idx.productOfModel[m.code] }; }
      return null; }).filter(Boolean);
    if (!items.length) return notFound();
    const only = q.get('diff') === '1';
    const name = it => it.p ? it.p.name : `${idx.brand[it.F.brandID]?.name || ''} ${it.m.name.replace(/^the /, '')}`;
    const rows = [];
    // 1. who it suits (website / curation)
    if (items.some(it => it.p?.suitedFor)) rows.push({ label: L('Voor wie', 'Who it suits'), cells: items.map(it => it.p?.suitedFor ? esc(it.p.suitedFor.text) : '<span class="faint">–</span>'), plain: true });
    // 2. folder rows
    const Fs = [...new Set(items.map(it => it.F).filter(F => F && items.some(it => it.m && it.F === F)))];
    Fs.forEach(F => {
      rows.push({ section: `${L('Volgens de folder', 'According to the folder')} (${idx.brand[F.brandID]?.name})` });
      rows.push({ label: L('Niveau', 'Level'), cells: items.map(it => it.m && it.F === F ? esc(LT(levelOf(F, it.m.level).title)) : '<span class="faint">–</span>') });
      F.rows.forEach(r => rows.push({ label: LT(r.label), cells: items.map(it => it.m && it.F === F ? folderCell(F, it.m.values[r.key]) : '<span class="faint">–</span>') }));
    });
    // 3. website specs (union of labels)
    const labels = [...new Set(items.flatMap(it => (it.p?.specs || []).map(s => s.label)))];
    if (labels.length) {
      rows.push({ section: L('Volgens kookwinkel.nl', 'According to kookwinkel.nl') });
      labels.forEach(lb => rows.push({ label: lb, cells: items.map(it => { const sp = it.p?.specs?.find(s => s.label === lb); return sp ? esc(sp.value) : '<span class="faint">–</span>'; }) }));
      rows.push({ label: L('Kleuren', 'Colours'), cells: items.map(it => it.p ? `${it.p.variants.length}` : '<span class="faint">–</span>') });
    }
    const same = r => r.cells && new Set(r.cells).size === 1;
    const shown = rows.filter(r => !only || r.section || r.plain || !same(r));
    const diffLink = `#/vergelijk?i=${encodeURIComponent(keys.join(','))}${only ? '' : '&diff=1'}`;
    return `${top(L('Vergelijken', 'Compare'))}
      <div class="seg" style="margin-top:4px"><a class="${only ? '' : 'on'}" href="#/vergelijk?i=${encodeURIComponent(keys.join(','))}">${L('Alles', 'Everything')}</a><a class="${only ? 'on' : ''}" href="${only ? '#' : diffLink}">${L('Alleen verschillen', 'Only differences')}</a></div>
      <div class="ctable-wrap"><table class="ctable cmp n${items.length}"><thead><tr><th class="rowh"></th>${items.map(it => `<th>
          ${it.p ? `<a href="#/p/${esc(it.p.id)}"><img src="${esc(productImg(it.p))}" alt=""></a>` : `<span class="cimg">${IC('machine')}</span>`}
          <a class="cname" href="${it.p ? `#/p/${esc(it.p.id)}` : `#/b/${esc(it.F.brandID)}`}">${esc(name(it))}</a>${it.m ? `<small>${esc(it.m.code)}</small>` : ''}
          <button class="pill tiny" data-act="cmpdrop" data-k="${esc(it.key)}">${L('Weg', 'Remove')}</button></th>`).join('')}</tr></thead><tbody>
        ${shown.map(r => r.section ? `<tr class="sec"><th colspan="${items.length + 1}">${esc(r.section)}</th></tr>`
          : `<tr class="${!r.plain && !same(r) ? 'diff' : ''}${r.plain ? ' plain' : ''}"><th class="rowh">${esc(r.label)}</th>${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="small muted">${L('Geel gemarkeerd = verschilt. Een streepje = staat niet in de bron.', 'Highlighted = differs. A dash = not in the source.')}</p>
      ${Fs.map(F => `<div class="source">${L('Folder', 'Folder')}: ${esc(LT(F.source))}</div>`).join('')}${labels.length ? `<div class="source">${L('Specificaties: kookwinkel.nl', 'Specifications: kookwinkel.nl')}</div>` : ''}`;
  };

  // ---------- tasks for new colleagues (booklet ch. 3) ----------
  const today = () => new Date().toISOString().slice(0, 10);
  const doneKey = () => 'oh.tasks.' + today();
  const doneSet = () => { try { return new Set(JSON.parse(localStorage.getItem(doneKey()) || '[]')); } catch { return new Set(); } };
  views.tasks = (_, q) => {
    if (!TASKS) return notFound();
    const tab = q.get('t') || 'dag'; const done = doneSet();
    const item = (id, t) => `<button class="task ${done.has(id) ? 'done' : ''}" data-act="task" data-id="${esc(id)}"><span class="tick">${IC('check')}</span><span>${esc(LT(t))}</span></button>`;
    const block = (sec, idp) => `<div class="tcard"><div class="tcard-h"><span class="icon">${IC(sec.icon)}</span><div><h3>${esc(LT(sec.title))}</h3>${sec.when ? `<div class="small muted">${esc(LT(sec.when))}</div>` : ''}</div>
        ${tab === 'week' && isToday(sec.id) ? `<span class="pill accent">${L('Vandaag', 'Today')}</span>` : ''}</div>
      ${sec.tasks ? `<div class="tasks">${sec.tasks.map((t, k) => item(`${idp}${sec.id}-${k}`, t)).join('')}</div>` : ''}
      ${(sec.steps || []).map((st, j) => `<div class="tstep"><span class="tstep-t">${IC('clock')} ${esc(LT(st.when))}</span><div class="tasks">${st.tasks.map((t, k) => item(`${idp}${sec.id}-${j}-${k}`, t)).join('')}</div></div>`).join('')}
      ${sec.warn ? `<div class="twarn">${IC('alert')}<span>${esc(LT(sec.warn))}</span></div>` : ''}</div>`;
    const dayIDs = TASKS.daily.flatMap(sec => sec.tasks ? sec.tasks.map((_, k) => `d${sec.id}-${k}`) : sec.steps.flatMap((st, j) => st.tasks.map((_, k) => `d${sec.id}-${j}-${k}`)));
    const n = dayIDs.filter(id => done.has(id)).length;
    const dow = new Date().getDay();
    return `<div class="hero"><h1>${L('Taken', 'Tasks')}</h1><p class="muted">${L('Wat er elke dag en elke week gedaan moet worden. Vink af wat je gedaan hebt; dat blijft alleen op deze telefoon en begint elke dag opnieuw.', 'What needs doing every day and every week. Tick off what you did; this stays on this phone only and starts fresh every day.')}</p></div>
      <div class="seg">${[['dag', L('Elke dag', 'Every day')], ['week', L('Per week', 'Weekly')], ['open', L('Openingstijden', 'Opening hours')]].map(([k, t]) => `<a class="${tab === k ? 'on' : ''}" href="#/taken?t=${k}">${t}</a>`).join('')}</div>
      ${tab === 'dag' ? `<div class="tprogress"><div><b>${n}/${dayIDs.length}</b> ${L('vandaag gedaan', 'done today')}</div><div class="progress"><i style="width:${Math.round(n / dayIDs.length * 100)}%"></i></div></div>${TASKS.daily.map(sec => block(sec, 'd')).join('')}` : ''}
      ${tab === 'week' ? TASKS.weekly.map(sec => block(sec, 'w')).join('') : ''}
      ${tab === 'open' ? `<div class="list">${TASKS.hours.days.map(([d, h], i) => `<div class="row ${(i + 1) % 7 === dow ? 'today' : ''}"><div class="grow name">${esc(LT(d))}</div><b class="score">${esc(h)}</b></div>`).join('')}</div>
        <p class="small muted">${esc(LT(TASKS.hours.note))}</p>` : ''}
      <div class="source">${L('Bron', 'Source')}: ${esc(LT(TASKS.source))}</div>`;
  };
  const isToday = id => ({ maandag: 1, woensdag: 3 })[id] === new Date().getDay();

  views.product = ([id], q) => {
    const p = idx.product[id]; if (!p) return notFound();
    const v = p.variants.find(x => x.id === q.get('v')) || p.variants[0];
    const brand = idx.brand[p.brandID];
    const notes = S.notesFor(p.id).filter(n => !n.variantID || n.variantID === v.id);
    const out = S.isOut(v.id); const fl = S.flag(v.id);
    return `${top(brand?.name)}
      <div class="photo"><img src="${esc(v.image)}" alt="${esc(p.name + ' ' + v.colorName)}">
        ${out ? `<span class="pill neg flag">${IC('flag')} ${L('Niet op voorraad', 'Out of stock')}</span>` : ''}
        <button class="photo-act" data-act="pmenu" data-v="${esc(v.id)}" aria-label="${L('Notitie, onjuistheid of voorraad melden', 'Add a note, report an inaccuracy or stock')}">${IC('plus')}</button></div>
      <div class="hero" style="margin-top:0"><div class="eyebrow">${p.typeIDs.map(t => esc(idx.type[t]?.name || t)).join(' · ')}</div>
        <h1>${esc(p.name)}</h1>${p.suitedFor ? `<p class="muted">${esc(p.suitedFor.text)}</p>` : ''}
        <div class="pills" style="margin-top:12px">${brand ? `<a class="pill" href="#/b/${esc(brand.id)}">${IC('tag')} ${L(`Alles van ${esc(brand.name)}`, `All ${esc(brand.name)}`)} →</a>` : ''}
          <button class="pill ${cmp.has('p:' + p.id) ? 'accent' : ''}" data-act="pick" data-k="p:${esc(p.id)}">${IC('compare')} ${cmp.has('p:' + p.id) ? L('Gekozen om te vergelijken', 'Picked to compare') : L('Vergelijk', 'Compare')}</button></div></div>
      ${p.variants.length > 1 ? `<div class="card tight"><div class="small muted">${L('Kleur', 'Colour')}: <b style="color:var(--text)">${esc(v.colorName)}</b></div>
        <div class="swatches">${p.variants.map(x => `<a class="swatch ${x.colorHex ? '' : 'txt'} ${x.id === v.id ? 'on' : ''} ${S.isOut(x.id) ? 'out' : ''}" data-act="swatch" href="#/p/${esc(p.id)}?v=${esc(x.id)}" aria-label="${esc(x.colorName)}" ${x.colorHex ? `style="background-color:${esc(x.colorHex)}"` : ''}>${x.colorHex ? '' : esc(x.colorName)}</a>`).join('')}</div></div>` : ''}
      <div class="card">
        <dl class="kv">${v.colorName ? `<dt>${L('Kleur', 'Colour')}</dt><dd>${esc(v.colorName)}</dd>` : ''}
          <dt>EAN</dt><dd class="ean">${v.ean ? esc(v.ean) : `<span class="pill warn">${L('ontbreekt', 'missing')}</span>`}</dd>
          ${v.articleNumber ? `<dt>${L('Artikelnummer', 'Article number')}</dt><dd class="ean">${esc(v.articleNumber)}</dd>` : ''}</dl>
        ${out ? `<div class="outline"><div class="outline-t">${IC('flag')} ${L(`${esc(v.colorName || p.name)} is niet op voorraad`, `${esc(v.colorName || p.name)} is out of stock`)}</div>
          <div class="small muted">${L('Gemeld door', 'Reported by')} ${esc(fl.author)}, ${esc(fmtTime(fl.updatedAt))}${fl.comment ? ' · ' + esc(fl.comment) : ''}</div>
          <button class="btn ghost small-btn" data-act="stock" data-v="${esc(v.id)}">${L('Weer op voorraad', 'Back in stock')}</button></div>` : ''}
      </div>
      ${notes.length ? `<div class="card good"><h3>${IC('pencil')} ${L('Goed om te weten', 'Good to know')}</h3>
        ${notes.map(n => `<div class="note">${esc(n.text)}<div class="meta"><span>${esc(n.author)} · ${esc(fmtTime(n.createdAt))}${n.variantID ? ` · ${L('alleen', 'only')} ${esc(idx.variant[n.variantID]?.v.colorName || '')}` : ''}</span>
          ${S.canDeleteNote(n) ? `<button class="faint" data-act="delnote" data-id="${esc(n.id)}">${L('Verwijder', 'Delete')}</button>` : ''}</div></div>`).join('')}</div>` : ''}
      <div class="card"><h3>${L('Kort voor de klant', 'In short for the customer')}</h3><ul class="bullets">${p.tellTheCustomer.map(b => `<li>${esc(b)}</li>`).join('')}</ul>${p.autoText ? `<p class="small muted" style="margin:8px 0 0">${L('Zinnen letterlijk uit de websitetekst gehaald; nog niet door een collega nagelezen.', 'Sentences taken word for word from the website text; not yet checked by a colleague.')}</p>` : ''}${source(p.source)}</div>
      ${mismatchCard(p.mismatchIDs)}
      ${p.specs?.length ? `<div class="card"><h3 style="margin-bottom:12px">${L('Specificaties', 'Specifications')}</h3><dl class="kv">${p.specs.map(s => `<dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd>`).join('')}</dl>${source(p.source)}</div>` : ''}
      <details class="card"><summary>${L('Originele tekst van de website', 'Original website text (Dutch)')}</summary><p class="orig">${esc(p.originalDescription)}</p>
        <div class="source"><a href="${esc(v.productURL)}" target="_blank" rel="noopener">${L('Open op kookwinkel.nl', 'Open on kookwinkel.nl')} ↗</a></div></details>
      ${idx.folderOf[p.id] ? `<a class="card tight folderlink" href="#/b/${esc(p.brandID)}"><span class="icon">${IC('compare')}</span><span class="grow"><b>${L(`In de ${esc(brand?.name)}-vergelijking`, `In the ${esc(brand?.name)} comparison`)}</b><span class="small muted">${esc(LT(levelOf(FOLDERS[p.brandID], idx.folderOf[p.id].level).title))} · ${esc(idx.folderOf[p.id].code)}</span></span>${chev}</a>` : ''}
      ${brand?.officialURL ? `<a class="btn ghost block" href="${esc(brand.officialURL)}" target="_blank" rel="noopener">${L(`Officiële ${esc(brand.name)}-website`, `Official ${esc(brand.name)} website`)} ↗</a>` : ''}${cmpBar()}`;
  };

  views.search = (_, q) => {
    const term = q.get('q') || '';
    return `<div class="hero"><h1>${L('Zoeken', 'Search')}</h1></div>
      <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="${L('Product, merk, kleur, EAN of onderwerp', 'Product, brand, colour, EAN or topic')}" value="${esc(term)}"></label>
      <div id="results">${results(term)}</div>`;
  };
  function results(term) {
    const toks = norm(term).split(/\s+/).filter(Boolean);
    if (!toks.length) return `<div class="empty">${L('Typ een naam, merk, kleur, barcode of onderwerp.', 'Type a name, brand, colour, barcode or topic.')}</div>`;
    const hits = idx.search.filter(x => toks.every(t => x.hay.includes(t))).map(x => x.p);
    const th = idx.topics.filter(x => toks.every(t => x.hay.includes(t)));
    const bh = idx.brandSearch.filter(x => toks.every(t => x.hay.includes(t))).map(x => x.b);
    const brandHTML = bh.length ? `<p class="muted small">${L('Merken', 'Brands')}</p><div class="list">${bh.map(b => { const n = C.products.filter(p => p.brandID === b.id).length;
      return `<a class="row" href="#/b/${esc(b.id)}"><span class="icon">${IC('tag')}</span><div class="grow"><div class="name">${esc(b.name)}</div><div class="sub">${L('Merkoverzicht', 'Brand overview')} · ${n} ${L('in de app', 'in the app')}${FOLDERS[b.id] ? ` · ${FOLDERS[b.id].models.length} ${L('modellen in de folder', 'models in the folder')}` : ''}</div></div>${chev}</a>`; }).join('')}</div>` : '';
    if (!hits.length && !th.length && !bh.length) return `<div class="empty">${L('Niets gevonden voor', 'Nothing found for')} “${esc(term)}”.</div>`;
    return `${brandHTML}${hits.length ? `<p class="muted small">${hits.length} ${L('producten', 'products')}</p><div class="list">${hits.slice(0, 80).map(p => productRow(p, idx.brand[p.brandID]?.name + ' · ' + p.typeIDs.map(t => idx.type[t]?.name).join(', '))).join('')}</div>` : ''}
      ${th.length ? `<p class="muted small">${th.length} ${L('onderwerpen uit het boekje', 'topics from the booklet')}</p><div class="list">${th.slice(0, 40).map(({ g, t }) => `<a class="row" href="#/g/${esc(g.id)}/${esc(t.id)}"><div class="grow"><div class="name">${esc(LT(t.title))}</div><div class="sub">${esc(LT(g.title))} · ${esc(pageLabel(t))}</div></div>${chev}</a>`).join('')}</div>` : ''}`;
  }

  views.scan = () => `<div class="hero"><h1>${L('Barcode scannen', 'Scan barcode')}</h1><p class="muted">${L('Richt de camera op de streepjescode op de doos.', 'Point the camera at the barcode on the box.')}</p></div>
      <div class="scanner"><video id="video" playsinline muted></video><div class="frame"></div></div>
      <form data-act="ean" class="card tight" style="display:flex;gap:10px"><input class="field" name="ean" inputmode="numeric" placeholder="${L('Of typ de EAN', 'Or type the EAN')}" autocomplete="off"><button class="btn" type="submit">${L('Zoek', 'Search')}</button></form>
      <p id="scanmsg" class="muted small" style="text-align:center"></p>`;

  views.notes = () => {
    const list = S.allNotes().filter(n => idx.product[n.productID]);
    return `${top('')}<div class="hero"><h1>${L('Notities', 'Notes')}</h1><p class="muted small"><span class="status-dot ${S.state.error ? 'off' : 'on'}"></span>${esc(syncLabel())}</p></div>
      ${list.length ? `<div class="list">${list.map(n => { const p = idx.product[n.productID]; return `<a class="row" href="#/p/${esc(p.id)}"><img class="thumb" src="${esc(productImg(p))}" alt=""><div class="grow">
        <div class="name">${esc(p.name)}</div><div class="sub">${esc(n.text)}</div><div class="sub faint">${esc(n.author)} · ${esc(fmtTime(n.createdAt))}</div></div>${chev}</a>`; }).join('')}</div>`
        : `<div class="empty">${L('Nog geen notities. Schrijf er een onderaan een productpagina.', 'No notes yet. Write one at the bottom of a product page.')}</div>`}`;
  };
  views.stock = () => `${top('')}<div class="hero"><h1>${L('Niet op voorraad', 'Out of stock')}</h1></div>
      ${outList() || `<div class="empty">${L('Niets gemeld.', 'Nothing reported.')}</div>`}`;

  views.check = () => {
    const groups = [
      [L('Verschillen boekje en website', 'Differences booklet vs website'), m => m.kind === 'bookletVsWebsite' && m.status !== 'confirmed', true],
      [L('Fouten op de website', 'Errors on the website'), m => m.kind === 'websiteData' && m.status !== 'confirmed'],
      [L('Nog te controleren', 'Still to check'), m => !m.kind && m.status !== 'confirmed'],
      [L('Bevestigd', 'Confirmed'), m => m.status === 'confirmed']];
    return `${top('')}<div class="hero"><h1>${L('Controle', 'Check')}</h1><p class="muted">${L('Punten waar het boekje en de website verschillen, of waar de website zelf iets fout toont. Vertel het de bedrijfsleider als je het antwoord weet.', 'Points where the booklet and the website differ, or where the website itself shows something wrong. Tell the manager if you know the answer.')}</p></div>
      ${groups.map(([title, f, open]) => { const l = C.mismatches.filter(f); return l.length ? `<details class="card" ${open ? 'open' : ''}><summary>${esc(title)} (${l.length})</summary>${l.map(m =>
        mismatchBlock(m) + (m.productIDs ? `<div class="small" style="margin:-6px 0 10px 17px">${m.productIDs.filter(id => idx.product[id]).map(id => `<a class="accent-text" href="#/p/${esc(id)}">${esc(idx.product[id].name)} →</a>`).join(' ')}</div>` : '')).join('')}</details>` : ''; }).join('')}`;
  };

  // ---------- quiz ----------
  let run = null;   // {quiz, i, chosen, score, done}
  const myResults = () => S.quizResults().filter(r => r.accountID === S.account?.id);
  views.quiz = () => {
    const mine = myResults();
    return `<div class="hero"><h1>Quiz</h1><p class="muted">${L('Test wat je weet. Alle vragen komen uit het informatieboekje en de producten in de app.', 'Test what you know. Every question comes from the information booklet and the products in the app.')}</p></div>
      ${Q.map((z, i) => { const best = Math.max(-1, ...mine.filter(r => r.quizID === z.id).map(r => r.score));
        return `<a class="card quiz-card" href="#/quiz/${esc(z.id)}">${icon(z.id, i)}<div class="grow"><div class="name">${esc(LT(z.title))}</div>
          <div class="sub muted">${best >= 0 ? L(`Beste score: ${best}/${z.questions.length}`, `Best score: ${best}/${z.questions.length}`) : L(`${z.questions.length} vragen`, `${z.questions.length} questions`)}</div></div><span class="play">${IC('play')}</span></a>`; }).join('')}
      ${mine.length ? `<h2>${L('Mijn resultaten', 'My results')}</h2><div class="list">${mine.slice(0, 10).map(r => `<div class="row"><div class="grow"><div class="name">${esc(LT(Q.find(z => z.id === r.quizID)?.title) || r.quizID)}</div><div class="sub">${esc(fmtTime(r.date))}</div></div><b class="score">${r.score}/${r.total}</b></div>`).join('')}</div>` : ''}`;
  };
  views.quizRun = ([id]) => {
    const z = Q.find(x => x.id === id); if (!z) return notFound();
    if (!run || run.quiz !== z) run = { quiz: z, i: 0, chosen: null, score: 0, done: false };
    if (run.done) {
      const s = run.score, n = z.questions.length;
      return `${top(LT(z.title))}<div class="card center"><div class="big">${IC(s >= 8 ? 'trophy' : s >= 5 ? 'star' : 'book')}</div><h1>${s}/${n}</h1>
        <p class="muted">${s >= 8 ? L('Top! Jij kent je producten.', 'Great! You know your products.') : s >= 5 ? L('Goed bezig. Lees de theorie nog eens door.', 'Good going. Read the theory again.') : L('Lees de theorie in de afdeling en probeer het opnieuw.', 'Read the theory in the department and try again.')}</p>
        <button class="btn block" data-act="quizagain">${L('Opnieuw', 'Try again')}</button><a class="btn ghost block" style="margin-top:10px" href="#/quiz">${L('Terug naar quizzen', 'Back to quizzes')}</a></div>`;
    }
    const q = z.questions[run.i];
    const src = q.source.kind === 'product'
      ? (() => { const pid = QUIZ_PRODUCT[q.source.productID] || q.source.productID; const p = idx.product[pid];
                 return L('Bron: productpagina ', 'Source: product page ') + (p ? `<a class="accent-text" href="#/p/${esc(pid)}">${esc(p.name)}</a>` : esc(q.source.productID)); })()
      : L('Bron: informatieboekje, p. ', 'Source: information booklet, p. ') + esc(q.source.page);
    return `${top(LT(z.title))}<div class="progress"><i style="width:${((run.i + (run.chosen == null ? 0 : 1)) / z.questions.length) * 100}%"></i></div>
      <div class="small muted" style="margin:10px 0">${L(`Vraag ${run.i + 1} van ${z.questions.length}`, `Question ${run.i + 1} of ${z.questions.length}`)}</div>
      <h2 style="margin-top:0">${esc(LT(q.question))}</h2>
      ${q.options.map((o, k) => { const cls = run.chosen == null ? '' : k === q.correct ? 'right' : k === run.chosen ? 'wrong' : '';
        return `<button class="option ${cls}" data-act="answer" data-k="${k}" ${run.chosen != null ? 'disabled' : ''}>${esc(LT(o))}${cls === 'right' ? ' ✓' : cls === 'wrong' ? ' ✗' : ''}</button>`; }).join('')}
      ${run.chosen != null ? `<div class="card" style="margin-top:6px"><b class="${run.chosen === q.correct ? 'pos-text' : 'accent-text'}">${run.chosen === q.correct ? L('Goed!', 'Correct!') : L('Helaas, niet goed.', 'Not quite.')}</b><div class="small muted" style="margin-top:6px">${src}</div></div>
        <button class="btn block" data-act="quiznext">${run.i + 1 < z.questions.length ? L('Volgende vraag', 'Next question') : L('Bekijk score', 'See score')}</button>` : ''}`;
  };

  // ---------- report (boss, developer) ----------
  const report = {};
  views.report = (_, q) => {
    if (!isManager()) return notFound();
    const period = q.get('periode') || 'all', person = q.get('persoon') || '', dept = q.get('afdeling') || '';
    const start = period === 'week' ? Date.now() - 7 * 864e5 : period === 'month' ? Date.now() - 30 * 864e5 : 0;
    const inP = d => new Date(d).getTime() >= start;
    const flags = S.outList().filter(f => idx.variant[f.variantID] && inP(f.updatedAt) && (!person || f.author === person) && (!dept || groupOfProduct(idx.product[f.productID])?.id === dept));
    const notes = S.allNotes().filter(n => idx.product[n.productID] && inP(n.createdAt) && (!person || n.author === person) && (!dept || groupOfProduct(idx.product[n.productID])?.id === dept));
    const quiz = S.quizResults().filter(r => inP(r.date) && (!person || r.accountName === person) && (!dept || r.quizID === dept));
    const issues = S.allIssues().filter(i => idx.product[i.productID] && inP(i.createdAt) && (!person || i.author === person) && (!dept || groupOfProduct(idx.product[i.productID])?.id === dept));
    const openIssues = issues.filter(i => !i.resolved), doneIssues = issues.filter(i => i.resolved);
    const people = [...new Set([...S.outList().map(f => f.author), ...S.allNotes().map(n => n.author), ...S.allIssues().map(i => i.author), ...S.quizResults().map(r => r.accountName)])].filter(Boolean).sort();
    const link = (k, v) => { const p = new URLSearchParams({ periode: period, persoon: person, afdeling: dept }); p.set(k, v); return '#/rapport?' + p.toString(); };
    report.rows = { flags, notes, quiz, issues };
    const issueRow = i => { const p = idx.product[i.productID]; const x = i.variantID && idx.variant[i.variantID];
      return `<div class="row issue ${i.resolved ? 'done' : ''}"><a href="#/p/${esc(p.id)}${x ? `?v=${esc(x.v.id)}` : ''}"><img class="thumb" src="${esc(x ? x.v.image : productImg(p))}" alt=""></a>
        <div class="grow"><a class="name" href="#/p/${esc(p.id)}${x ? `?v=${esc(x.v.id)}` : ''}">${esc(p.name)}</a><div class="sub">${esc(i.text)}</div>
        <div class="sub faint">${esc(i.author)} · ${esc(fmtTime(i.createdAt))}${x ? ' · ' + esc(x.v.colorName) : ''}${i.resolved && i.resolvedBy ? ` · ${L('opgelost door', 'resolved by')} ${esc(i.resolvedBy)}` : ''}</div></div>
        <button class="pill ${i.resolved ? '' : 'accent'}" data-act="resolve" data-id="${esc(i.id)}" data-r="${i.resolved ? '0' : '1'}">${i.resolved ? L('Heropen', 'Reopen') : L('Opgelost', 'Resolved')}</button></div>`; };
    const issueWarn = S.state.issuesSetup === false ? `<div class="card tight small">${IC('alert')} ${L('Meldingen worden nog niet gedeeld: voer eerst het SQL-bestand voor onjuistheden uit in Supabase. Tot dan blijven ze op deze telefoon.', 'Reports are not shared yet: first run the SQL file for inaccuracies in Supabase. Until then they stay on this phone.')}</div>` : '';
    const none = `<p class="muted small">${L('Niets in deze selectie.', 'Nothing in this selection.')}</p>`;
    return `${top('')}<div class="hero"><h1>${L('Rapport', 'Report')}</h1><p class="muted small">${L('Gemelde onjuistheden, wat er niet op voorraad is, alle notities en de quizscores.', 'Reported inaccuracies, what is out of stock, all notes and the quiz scores.')}</p></div>
      <div class="seg">${[['week', L('7 dagen', '7 days')], ['month', L('30 dagen', '30 days')], ['all', L('Alles', 'All')]].map(([k, t]) => `<a class="${period === k ? 'on' : ''}" href="${link('periode', k)}">${t}</a>`).join('')}</div>
      <div class="filters"><select class="field" data-act="filter" data-k="persoon"><option value="">${L('Iedereen', 'Everyone')}</option>${people.map(p => `<option ${p === person ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
        <select class="field" data-act="filter" data-k="afdeling"><option value="">${L('Alle afdelingen', 'All departments')}</option>${B.groups.map(g => `<option value="${esc(g.id)}" ${g.id === dept ? 'selected' : ''}>${esc(LT(g.title))}</option>`).join('')}</select></div>
      <button class="btn ghost block" data-act="csv" style="margin-bottom:6px">${IC('download')} ${L('Download als CSV (Excel)', 'Download as CSV (Excel)')}</button>
      <div class="section-title"><h2>${L('Onjuistheden gemeld', 'Reported inaccuracies')}</h2><span class="muted small">${openIssues.length} ${L('open', 'open')}</span></div>
      ${issueWarn}${openIssues.length ? `<div class="list">${openIssues.map(issueRow).join('')}</div>` : none}
      ${doneIssues.length ? `<details class="card tight"><summary class="small">${L('Opgelost', 'Resolved')} (${doneIssues.length})</summary><div class="list" style="margin-top:10px">${doneIssues.map(issueRow).join('')}</div></details>` : ''}
      <div class="section-title"><h2>${L('Niet op voorraad', 'Out of stock')}</h2><span class="muted small">${flags.length}</span></div>
      ${flags.length ? `<div class="list">${flags.map(f => { const x = idx.variant[f.variantID]; return `<a class="row" href="#/p/${esc(x.p.id)}?v=${esc(x.v.id)}"><img class="thumb" src="${esc(x.v.image)}" alt=""><div class="grow"><div class="name">${esc(x.p.name)}</div><div class="sub">${esc(x.v.colorName)}${f.comment ? ' · ' + esc(f.comment) : ''}</div><div class="sub faint">${esc(f.author)} · ${esc(fmtTime(f.updatedAt))}</div></div>${chev}</a>`; }).join('')}</div>` : none}
      <div class="section-title"><h2>${L('Notities', 'Notes')}</h2><span class="muted small">${notes.length}</span></div>
      ${notes.length ? `<div class="list">${notes.map(n => { const p = idx.product[n.productID]; return `<a class="row" href="#/p/${esc(p.id)}"><img class="thumb" src="${esc(productImg(p))}" alt=""><div class="grow"><div class="name">${esc(p.name)}</div><div class="sub">${esc(n.text)}</div><div class="sub faint">${esc(n.author)} · ${esc(fmtTime(n.createdAt))}</div></div>${chev}</a>`; }).join('')}</div>` : none}
      <div class="section-title"><h2>${L('Quizscores', 'Quiz scores')}</h2><span class="muted small">${quiz.length}</span></div>
      ${quiz.length ? `<div class="list">${quiz.map(r => `<div class="row"><div class="grow"><div class="name">${esc(r.accountName)}</div><div class="sub">${esc(LT(Q.find(z => z.id === r.quizID)?.title) || r.quizID)} · ${esc(fmtTime(r.date))}</div></div><b class="score">${r.score}/${r.total}</b></div>`).join('')}</div>` : none}`;
  };
  function downloadCSV() {
    const f = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const lines = [[L('Soort', 'Type'), L('Datum', 'Date'), L('Persoon', 'Person'), L('Onderwerp', 'Subject'), 'Details'].map(f).join(';')];
    const { flags = [], notes = [], quiz = [], issues = [] } = report.rows || {};
    flags.forEach(x => { const v = idx.variant[x.variantID]; lines.push([L('Niet op voorraad', 'Out of stock'), x.updatedAt, x.author, v.p.name, [v.v.colorName, x.comment].filter(Boolean).join(' · ')].map(f).join(';')); });
    issues.forEach(i => lines.push([L('Onjuistheid', 'Inaccuracy') + (i.resolved ? ' (' + L('opgelost', 'resolved') + ')' : ''), i.createdAt, i.author, idx.product[i.productID].name, [i.variantID && idx.variant[i.variantID]?.v.colorName, i.text].filter(Boolean).join(' · ')].map(f).join(';')));
    notes.forEach(n => lines.push([L('Notitie', 'Note'), n.createdAt, n.author, idx.product[n.productID].name, n.text].map(f).join(';')));
    quiz.forEach(r => lines.push(['Quiz', r.date, r.accountName, LT(Q.find(z => z.id === r.quizID)?.title) || r.quizID, `${r.score}/${r.total}`].map(f).join(';')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = L('Oldenhof-rapport.csv', 'Oldenhof-report.csv');
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- accounts (boss, developer) ----------
  views.accounts = () => {
    if (!isManager()) return notFound();
    return `${top('')}<div class="hero"><h1>${L('Accounts', 'Accounts')}</h1><p class="muted small">${L('Een account werkt op elke telefoon van het team.', "An account works on every team member's phone.")}</p></div>
      <a class="btn block" href="#/accounts/nieuw" style="margin-bottom:14px">+ ${L('Nieuw account', 'New account')}</a>
      <div class="card tight small muted">${rankBadge('developer')} ${L('alles, ook bazen en developers beheren', 'everything, including managing bosses and developers')}<br>
        ${rankBadge('boss')} ${L('rapport, en accounts van medewerkers', 'report, and employee accounts')}<br>${rankBadge('employee')} ${L('producten, notities, voorraad en quiz', 'products, notes, stock and quiz')}</div>
      ${rankGroups(S.accounts, l => `<div class="list">${l.map(a => `<div class="row">${avatar(a, 44)}<div class="grow"><div class="name">${esc(a.name)}${a.id === S.account.id ? ` <span class="faint small">(${L('jij', 'you')})</span>` : ''}</div>
        <div class="sub">${a.workID ? `${L('Werknr.', 'Work ID')} ${esc(a.workID)}` : esc(roleName(a.role))}</div></div>
        ${S.canEdit(a) ? `<a class="pill" href="#/accounts/${esc(a.id)}">${L('Wijzig', 'Edit')}</a>` : ''}
        ${S.canDelete(a) ? `<button class="pill neg" data-act="delacc" data-id="${esc(a.id)}">${L('Verwijder', 'Delete')}</button>` : ''}</div>`).join('')}</div>`)}`;
  };
  views.accountEdit = ([id]) => {
    if (!isManager()) return notFound();
    const me = S.account;
    if (id === 'nieuw') return `${top(L('Accounts', 'Accounts'))}<div class="hero"><h1>${L('Nieuw account', 'New account')}</h1></div>${accountForm(null, S.assignable(me.role), 'new')}`;
    const a = S.accounts.find(x => x.id === id); if (!a || !S.canEdit(a)) return notFound();
    const roles = a.id === me.id ? [a.role] : S.assignable(me.role);
    return `${top(L('Accounts', 'Accounts'))}<div class="hero"><h1>${L('Account wijzigen', 'Edit account')}</h1></div>${accountForm(a, roles.includes(a.role) ? roles : [a.role, ...roles], 'edit')}`;
  };

  views.about = () => `${top('')}<div class="hero"><h1>${L('Over de app', 'About')}</h1></div>
    <div class="card"><h3>${L('Gedeeld met het team', 'Shared with the team')}</h3>
      <p>${L('Accounts, notities, voorraadmeldingen en quizscores worden gedeeld met het hele team via de teamcode. Alles wat je zonder internet doet, wordt verstuurd zodra er weer verbinding is.', 'Accounts, notes, stock reports and quiz scores are shared with the whole team through the team code. Anything you do offline is sent as soon as there is a connection again.')}</p>
      <p class="small muted">${L('Pincodes worden alleen versleuteld bewaard. Na 5 verkeerde pincodes is een account 5 minuten geblokkeerd.', 'PINs are only stored encrypted. After 5 wrong PINs an account is locked for 5 minutes.')}</p>
      <p class="small muted"><span class="status-dot ${S.state.error ? 'off' : 'on'}"></span>${esc(syncLabel())}</p>
      <button class="btn ghost block" data-act="sync">${L('Nu bijwerken', 'Update now')}</button></div>
    <div class="card"><h3>${L('Op je beginscherm zetten', 'Add to your home screen')}</h3><ul class="bullets">
      ${L(`<li><b>iPhone (Safari):</b> deel-knop → “Zet op beginscherm”.</li><li><b>Android (Chrome):</b> menu ⋮ → “App installeren” of “Toevoegen aan startscherm”.</li><li>Daarna werkt de app ook zonder internet.</li>`,
          `<li><b>iPhone (Safari):</b> share button → “Add to Home Screen”.</li><li><b>Android (Chrome):</b> menu ⋮ → “Install app” or “Add to Home screen”.</li><li>After that the app also works without internet.</li>`)}</ul></div>
    <form data-act="team" class="card"><h3>${L('Teamcode', 'Team code')}</h3><p class="small muted">${L('Alleen wijzigen als de bedrijfsleider een nieuwe code geeft.', 'Only change this when the manager gives a new code.')}</p>
      <input class="field" name="c" type="text" placeholder="${L('Nieuwe teamcode', 'New team code')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" style="margin-bottom:10px"><button class="btn ghost block">${L('Opslaan', 'Save')}</button></form>
    <p class="faint small" style="text-align:center">${L('Productinformatie: kookwinkel.nl en het informatieboekje Kookwinkel Oldenhof Maastricht', 'Product information: kookwinkel.nl and the Kookwinkel Oldenhof Maastricht information booklet')} · ${esc(C.products.length)} ${L('producten', 'products')} · ${L('versie', 'version')} ${esc(C.version)}</p>`;

  function syncLabel() {
    if (!S.remote) return L('Alleen op dit toestel', 'This device only');
    if (!S.hasTeamCode) return L('Teamcode nog niet ingesteld', 'Team code not set yet');
    if (!navigator.onLine) return L(`Offline · ${S.pending()} wijziging(en) wachten`, `Offline · ${S.pending()} change(s) waiting`);
    if (S.state.syncing) return L('Bijwerken…', 'Updating…');
    if (S.state.error) return (S.state.error === 'teamcode' || /\b40[13]\b/.test(S.state.error)) ? L('Teamcode klopt niet.', 'Team code is wrong.')
      : S.state.error === 'setup' ? errText('setup') : L('Delen lukt niet: ', 'Sharing failed: ') + S.state.error;
    return S.state.lastSync ? L(`Gedeeld · bijgewerkt ${fmtTime(S.state.lastSync)}`, `Shared · updated ${fmtTime(S.state.lastSync)}`) : L('Gedeeld', 'Shared');
  }
  function notFound() { return `${top('')}<div class="empty">${L('Niet gevonden.', 'Not found.')}</div>`; }

  // ---------- router ----------
  let stopScan = null;
  function route() {
    if (!C) return;
    if (stopScan) { stopScan(); stopScan = null; }
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const q = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    let html, tab = 'home';
    const gated = S.remote && !S.account;
    document.body.classList.toggle('gate', gated);
    if (gated) html = gateView();
    else if (!parts.length) html = views.home();
    else if (parts[0] === 'g' && parts[3]) html = views.part([parts[1], parts[2], parts[3]]);
    else if (parts[0] === 'g' && parts[2]) html = views.topic([parts[1], parts[2]]);
    else if (parts[0] === 'g') html = views.group([parts[1]], q);
    else if (parts[0] === 'c') html = views.category(parts.slice(1));
    else if (parts[0] === 't' && parts[2] === 'b') html = views.brand([parts[1], parts[3]]);
    else if (parts[0] === 't') html = views.type(parts.slice(1));
    else if (parts[0] === 'b') html = views.brand([null, parts[1]]);
    else if (parts[0] === 'p') html = views.product(parts.slice(1), q);
    else if (parts[0] === 'zoek') { html = views.search(parts, q); tab = 'zoek'; }
    else if (parts[0] === 'vergelijk') html = views.compare(parts, q);
    else if (parts[0] === 'folder') html = views.folder(parts.slice(1));
    else if (parts[0] === 'taken') { html = views.tasks(parts, q); tab = 'taken'; }
    else if (parts[0] === 'scan') { html = views.scan(); tab = 'scan'; }
    else if (parts[0] === 'quiz' && parts[1]) { html = views.quizRun([parts[1]]); tab = 'quiz'; }
    else if (parts[0] === 'quiz') { run = null; html = views.quiz(); tab = 'quiz'; }
    else if (parts[0] === 'notities' || parts[0] === 'team') html = views.notes();
    else if (parts[0] === 'voorraad') html = views.stock();
    else if (parts[0] === 'check') html = views.check();
    else if (parts[0] === 'rapport') html = views.report(parts, q);
    else if (parts[0] === 'accounts' && parts[1]) html = views.accountEdit([parts[1]]);
    else if (parts[0] === 'accounts') html = views.accounts();
    else if (parts[0] === 'over' || parts[0] === 'instellingen') html = views.about();
    else html = notFound();
    app.innerHTML = html;
    const TABS = { home: 'Home', zoek: L('Zoeken', 'Search'), scan: L('Scannen', 'Scan'), taken: L('Taken', 'Tasks'), quiz: 'Quiz' };
    document.querySelectorAll('.tabbar a').forEach(a => { a.classList.toggle('on', a.dataset.tab === tab); const sp = a.querySelector('span'); if (sp) sp.textContent = TABS[a.dataset.tab]; a.setAttribute('aria-label', TABS[a.dataset.tab]); });
    if (route.last !== location.hash.split('?')[0]) window.scrollTo(0, 0);
    route.last = location.hash.split('?')[0];
    if (!gated && tab === 'zoek') wireSearch();
    if (!gated && tab === 'scan') startScan();
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
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'FORM' || b.tagName === 'SELECT') return;
    const act = b.dataset.act;
    if (act === 'pick') { const k = b.dataset.k; cmp.has(k) ? cmp.delete(k) : cmp.size < 4 ? cmp.add(k) : toast(L('Maximaal 4 tegelijk', 'At most 4 at a time')); route(); return; }
    if (act === 'cmpclear') { cmp.clear(); route(); return; }
    if (act === 'cmpdrop') { cmp.delete(b.dataset.k); const [path, qs] = location.hash.split('?'); const p = new URLSearchParams(qs || '');
      const left = (p.get('i') || '').split(',').filter(k => k && k !== b.dataset.k); if (!left.length) { history.back(); return; } p.set('i', left.join(',')); location.replace(path + '?' + p.toString()); return; }
    if (act === 'task') { const d = doneSet(); const id = b.dataset.id; d.has(id) ? d.delete(id) : d.add(id); try { localStorage.setItem(doneKey(), JSON.stringify([...d])); } catch {} route(); return; }
    if (act === 'swatch') { e.preventDefault(); location.replace(b.getAttribute('href')); return; }
    if (act === 'pmenu') {
      const x = idx.variant[b.dataset.v]; const cn = esc(x.v.colorName); const out = S.isOut(x.v.id);
      const opt = (a, ic, t, sub, cls = '') => `<button class="sheet-row ${cls}" data-act="${a}" data-v="${esc(x.v.id)}"><span class="sheet-ic">${IC(ic)}</span><span class="grow"><b>${t}</b><span>${sub}</span></span>${chev}</button>`;
      openDialog(`<h3>${esc(x.p.name)}</h3><p class="small muted" style="margin:0 0 12px">${L('Kleur', 'Colour')}: ${cn}</p><div class="sheet">
        ${opt('notedlg', 'pencil', L('Productnotitie', 'Product note'), L('Goed om te weten. Staat boven ‘Kort voor de klant’.', 'Good to know. Shown above ‘In short for the customer’.'))}
        ${opt('issuedlg', 'alert', L('Onjuistheid melden', 'Report an inaccuracy'), L('Komt in het rapport voor de developer en bazen.', 'Goes to the report for the developer and bosses.'))}
        ${opt('stock', 'flag', out ? L('Weer op voorraad', 'Back in stock') : L('Niet op voorraad', 'Out of stock'), out ? L(`${cn} is weer leverbaar`, `${cn} is available again`) : L(`Alleen voor de kleur ${cn}`, `Only for the colour ${cn}`), out ? '' : 'neg')}
        </div><button class="btn ghost block" data-act="closedlg" style="margin-top:12px">${L('Annuleer', 'Cancel')}</button>`);
      return;
    }
    if (act === 'notedlg') {
      const x = idx.variant[b.dataset.v];
      openDialog(`<form data-act="addnote" data-p="${esc(x.p.id)}" data-v="${esc(x.v.id)}"><h3>${L('Productnotitie', 'Product note')}</h3>
        <p class="small muted">${L("Iets wat goed is om te weten over dit product. Collega's zien het boven ‘Kort voor de klant’.", 'Something good to know about this product. Colleagues see it above ‘In short for the customer’.')}</p>
        <textarea name="t" required maxlength="1000" placeholder="${L('Bijv. demo-model staat bij de kassa', 'E.g. demo model is at the till')}"></textarea>
        <label class="check"><input type="checkbox" name="only"> ${L('Alleen voor kleur', 'Only for colour')} ${esc(x.v.colorName)}</label>
        <div class="dlg-btns"><button type="button" class="btn ghost" data-act="closedlg">${L('Annuleer', 'Cancel')}</button><button class="btn">${L('Opslaan', 'Save')}</button></div></form>`);
      return;
    }
    if (act === 'issuedlg') {
      const x = idx.variant[b.dataset.v];
      openDialog(`<form data-act="addissue" data-p="${esc(x.p.id)}" data-v="${esc(x.v.id)}"><h3>${L('Onjuistheid melden', 'Report an inaccuracy')}</h3>
        <p class="small muted">${L('Wat klopt er niet? Dit komt in het rapport voor de developer en de bazen.', 'What is wrong? This goes to the report for the developer and the bosses.')}</p>
        <textarea name="t" required maxlength="1000" placeholder="${L('Bijv. de inhoud is 5,3 liter, niet 6,7', 'E.g. the capacity is 5.3 litres, not 6.7')}"></textarea>
        <div class="dlg-btns" style="margin-top:12px"><button type="button" class="btn ghost" data-act="closedlg">${L('Annuleer', 'Cancel')}</button><button class="btn">${L('Meld', 'Report')}</button></div></form>`);
      return;
    }
    if (act === 'resolve') { S.setIssueResolved(b.dataset.id, b.dataset.r === '1'); return; }
    if (act === 'stock') {
      const x = idx.variant[b.dataset.v]; const cn = x.v.colorName;
      if (S.isOut(x.v.id)) { S.setOut(x.p.id, x.v.id, false); closeDialog(); toast(L(`${cn} weer op voorraad`, `${cn} back in stock`)); }
      else openDialog(`<form data-act="report-out" data-p="${esc(x.p.id)}" data-v="${esc(x.v.id)}"><h3>${L(`${esc(cn)} niet op voorraad?`, `${esc(cn)} out of stock?`)}</h3>
        <p class="small muted">${L("Collega's zien dit direct bij het product.", 'Colleagues see this straight away on the product.')}</p>
        <input class="field" name="c" placeholder="${L('Toelichting (optioneel)', 'Comment (optional)')}" maxlength="200" style="margin-bottom:12px">
        <div class="dlg-btns"><button type="button" class="btn ghost" data-act="closedlg">${L('Annuleer', 'Cancel')}</button><button class="btn">${L('Meld', 'Report')}</button></div></form>`);
    } else if (act === 'delnote') {
      if (confirm(L('Deze notitie verwijderen?', 'Delete this note?'))) S.deleteNote(b.dataset.id);
    } else if (act === 'sync') { S.sync(); }
    else if (act === 'retry') { S.state.error = null; S.state.accountsLoaded = false; route(); }
    else if (act === 'lang' && b.dataset.l !== LANG) {
      LANG = b.dataset.l; setPref('oh.lang', LANG);
      load().then(() => { route(); if (document.getElementById('menu').classList.contains('open')) openMenu(); });
    } else if (act === 'theme') { THEME = b.dataset.t; setPref('oh.theme', THEME); applyTheme(); openMenu(); }
    else if (act === 'menu') openMenu();
    else if (act === 'closemenu') closeMenu();
    else if (act === 'closedlg') closeDialog();
    else if (act === 'logout') { closeMenu(); gate = { selected: null, error: '', busy: false }; S.logOut(); location.hash = '#/'; route(); }
    else if (act === 'gateadd') { gate = { selected: null, error: '', busy: false, adding: {} }; route(); }
    else if (act === 'gatecancel') { if (gate.adding?.token) S.endManagerCheck(gate.adding.token); gate = { selected: null, error: '', busy: false }; route(); }
    else if (act === 'gatemgr') { gate.adding.managerID = b.dataset.id; gate.error = ''; route(); setTimeout(() => app.querySelector('input[name=pin]')?.focus(), 30); }
    else if (act === 'pick') { gate.selected = b.dataset.id; gate.error = ''; route(); setTimeout(() => app.querySelector('input[name=pin]')?.focus(), 30); }
    else if (act === 'answer' && run && run.chosen == null) {
      run.chosen = +b.dataset.k; if (run.chosen === run.quiz.questions[run.i].correct) run.score++; route();
    } else if (act === 'quiznext' && run) {
      if (run.i + 1 < run.quiz.questions.length) { run.i++; run.chosen = null; }
      else { run.done = true; S.addQuizResult(run.quiz.id, run.score, run.quiz.questions.length); }
      route(); scrollTo(0, 0);
    } else if (act === 'quizagain' && run) { run = { quiz: run.quiz, i: 0, chosen: null, score: 0, done: false }; route(); }
    else if (act === 'csv') downloadCSV();
    else if (act === 'nophoto') { formPhoto = null; const pv = document.getElementById('photoPrev'); if (pv) pv.innerHTML = avatar({ name: b.form?.elements?.name?.value || '+' }, 84); }
    else if (act === 'delacc') {
      const a = S.accounts.find(x => x.id === b.dataset.id);
      if (a && confirm(L(`Account van ${a.name} verwijderen?`, `Delete ${a.name}'s account?`)))
        S.deleteAccount(a.id).then(r => toast(r.error ? errText(r.error) : L('Verwijderd', 'Deleted'))).catch(() => toast(errText('offline')));
    }
  });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.act === 'filter') {
      const [path, qs] = location.hash.split('?'); const p = new URLSearchParams(qs || ''); p.set(t.dataset.k, t.value); location.hash = path + '?' + p.toString();
    } else if (t.name === 'photo' && t.files && t.files[0]) {
      try { formPhoto = await resizePhoto(t.files[0]); document.getElementById('photoPrev').innerHTML = avatar({ photo: formPhoto }, 84); }
      catch { toast(L('Deze foto kan niet worden gelezen.', 'This photo cannot be read.')); }
    }
  });
  document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('pin')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
  document.addEventListener('submit', async e => {
    const f = e.target; if (!f.dataset.act) return; e.preventDefault();
    const act = f.dataset.act;
    if (act === 'addnote') {
      const t = f.t.value.trim(); if (!t) return;
      S.addNote(f.dataset.p, f.only.checked ? f.dataset.v : null, t); f.t.value = ''; f.t.blur(); closeDialog(); toast(L('Notitie opgeslagen', 'Note saved')); route();
    } else if (act === 'addissue') {
      const t = f.t.value.trim(); if (!t) return;
      S.addIssue(f.dataset.p, f.dataset.v, t); f.t.blur(); closeDialog(); toast(L('Gemeld. Dank je!', 'Reported. Thank you!')); route();
    } else if (act === 'report-out') {
      S.setOut(f.dataset.p, f.dataset.v, true, f.c.value.trim()); closeDialog(); route();
      toast(L(`${idx.variant[f.dataset.v].v.colorName} gemeld als niet op voorraad`, `${idx.variant[f.dataset.v].v.colorName} reported out of stock`));
    } else if (act === 'team') {
      const c = f.c.value.trim(); if (!c) return;
      S.setTeamCode(c); f.c.value = ''; toast(L('Teamcode opgeslagen', 'Team code saved')); route();
    } else if (act === 'ean') { const v = f.ean.value.replace(/\D/g, ''); if (v) openEAN(v); }
    else if (act === 'login') {
      if (f.pin.value.length !== 4) { gate.error = L('Vul 4 cijfers in.', 'Enter 4 digits.'); route(); return; }
      gate.busy = true; gate.error = '';
      try { const r = await S.logIn(gate.selected, f.pin.value, f.stay.checked); gate.error = r.error ? errText(r.error) : ''; }
      catch (err) { gate.error = navigator.onLine ? errText(err.message) : errText('offline'); }
      gate.busy = false; if (S.account) { gate.selected = null; location.hash = '#/'; } route();
    } else if (act === 'gatemgr') {
      if (f.pin.value.length !== 4) { gate.error = L('Vul 4 cijfers in.', 'Enter 4 digits.'); route(); return; }
      gate.busy = true; gate.error = '';
      try {
        const r = await S.managerCheck(gate.adding.managerID, f.pin.value);
        if (r.error) gate.error = errText(r.error);
        else if (r.account.role === 'employee') { S.endManagerCheck(r.token); gate.error = errText('forbidden'); }
        else gate.adding = { token: r.token, manager: r.account };
      } catch (err) { gate.error = navigator.onLine ? errText(err.message) : errText('offline'); }
      gate.busy = false; route();
    } else if (act === 'account') {
      const err = m => { const el = document.getElementById('formErr'); if (el) el.textContent = m; };
      const el = f.elements;
      const name = el.name.value.trim(), work = el.work.value.trim(), role = el.role.value, pin = el.pin.value, pin2 = el.pin2.value;
      const mode = f.dataset.mode;
      if (!name) return err(L('Vul een naam in.', 'Enter a name.'));
      if ((mode !== 'edit' || pin) && !/^\d{4}$/.test(pin)) return err(L('De pincode moet 4 cijfers zijn.', 'The PIN must be 4 digits.'));
      if (pin !== pin2) return err(L('De pincodes zijn niet gelijk.', 'The PINs do not match.'));
      const btn = f.querySelector('button.btn'); btn.disabled = true;
      try {
        const r = mode === 'firstrun' ? await S.createFirstDeveloper(name, work, pin, formPhoto)
                : mode === 'gate' ? await S.addAccountAs(gate.adding.token, name, work, role, pin, formPhoto)
                : await S.saveAccount(mode === 'edit' ? f.dataset.id : null, name, work, role, pin || null, formPhoto);
        if (r.error) { btn.disabled = false; return err(errText(r.error)); }
        if (mode === 'gate') { S.endManagerCheck(gate.adding.token); gate = { selected: r.account.id, error: '', busy: false };
          toast(L(`Account van ${r.account.name} gemaakt. Log nu in.`, `${r.account.name}'s account created. Log in now.`)); route(); return; }
        toast(L('Opgeslagen', 'Saved')); document.activeElement?.blur?.(); location.hash = mode === 'firstrun' ? '#/' : '#/accounts'; route();
      } catch (ex) { btn.disabled = false; err(navigator.onLine ? errText(ex.message) : errText('offline')); }
    }
  });
  S.onChange(() => {
    // re-render, but never while someone is typing, in a dialog, in a quiz or in a form
    const a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT')) return;
    if (document.getElementById('dlg').classList.contains('open')) return;
    if (/^#\/(zoek|scan|quiz\/|accounts\/)/.test(location.hash)) return;
    if (document.body.classList.contains('gate') && !S.account && (gate.selected || gate.adding)) return;
    const y = scrollY; route(); scrollTo(0, y);
  });

  // background download of all product photos so they work offline too (4 at a time, polite on slow or data-saving connections)
  async function prefetchPhotos() {
    try {
      const cn = navigator.connection; if (cn && (cn.saveData || /(^|-)2g$/.test(cn.effectiveType || ''))) return;
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      await navigator.serviceWorker.ready;
      await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 4000 }));
      const cache = await caches.open('oldenhof-img');
      const have = new Set((await cache.keys()).map(r => new URL(r.url).pathname));
      const todo = [...new Set(C.products.flatMap(p => p.variants.map(v => v.image)).filter(Boolean))]
        .filter(u => !have.has(new URL(u, location.href).pathname));
      let i = 0;
      await Promise.all([0, 1, 2, 3].map(async () => { while (i < todo.length) { const u = todo[i++]; try { await fetch(u); } catch { /* offline: try again next start */ } } }));
    } catch { /* optional */ }
  }

  // ---------- start ----------
  window.addEventListener('hashchange', () => { closeMenu(); route(); });
  load().then(route).catch(() => { app.innerHTML = `<div class="empty">${L('De gegevens konden niet worden geladen. Open de app één keer met internet.', 'The data could not be loaded. Open the app once with internet.')}</div>`; });
  if ('serviceWorker' in navigator) {
    // when a new version is installed, reload once so nobody keeps an old copy
    const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      prefetchPhotos();
    });
  }
})();
