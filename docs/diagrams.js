/* Drawings and infographics for the product guide (booklet chapter 6).
   Everything shown comes from the information booklet: the four booklet figures (p. 12, 13, 14, 18) redrawn,
   and infographics that put booklet text side by side. Names are shown in the app language, with the other
   language underneath, so colleagues learn both. Nothing is added that the booklet does not say. */
(function () {
  'use strict';
  let LANG = 'nl';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (nl, en) => (LANG === 'en' ? en : nl);
  // a name in the app language with the other language below it
  const dual = (nl, en, cls = '') => `<span class="dual ${cls}"><b>${esc(T(nl, en))}</b>${nl !== en ? `<i>${esc(T(en, nl))}</i>` : ''}</span>`;
  const head = (nl, en, sub) => `<div class="dg-head"><h3>${esc(T(nl, en))}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  const src = page => `<div class="dg-src">${esc(T('Bron: informatieboekje', 'Source: information booklet'))}${page ? `, p. ${page}` : ''}</div>`;

  // ---------- small icons (stroke drawings) ----------
  const I = {
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    coil: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/>',
    glass: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h10" stroke-dasharray="2 2"/>',
    magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>',
    pan: '<path d="M3 11h13v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M16 12h6"/>',
    pot: '<path d="M5 9h14v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M3 9h18M9 6h6"/>',
    sauce: '<path d="M4 10h11v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M15 12l7-3"/>',
    casserole: '<path d="M4 11h16v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M2 12h2M20 12h2M6 11c0-3 12-3 12 0M11 6h2"/>',
    kettle: '<path d="M6 10h12l-1 9H7z"/><path d="M8 10c0-4 8-4 8 0M18 12l3-2M11 5h2"/>',
    hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/>',
    beans: '<ellipse cx="9" cy="10" rx="4" ry="5" transform="rotate(-25 9 10)"/><ellipse cx="15" cy="15" rx="4" ry="5" transform="rotate(-25 15 15)"/>',
    scale: '<path d="M4 18h16M12 4v14M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z"/>',
    drop: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>',
    milk: '<path d="M8 3h8v3l2 3v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9l2-3z"/><path d="M6 12h12"/>',
    rod: '<path d="M4 20l12-12M15 5l4 4M17 3l4 4"/>',
    stone: '<path d="M3 15l4-6h14l-4 6z"/><path d="M3 15v3h14v-3M17 18l4-6v-3"/>',
    oven: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="6" y="9" width="12" height="8" rx="1"/><path d="M7 6.5h.01M10 6.5h.01"/>',
    oil: '<path d="M10 3h4v3l2 2v12H8V8l2-2z"/><path d="M8 13h8"/>',
    soap: '<rect x="4" y="9" width="16" height="10" rx="3"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="4" r="1.5"/>',
    noDish: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M4 21L20 3"/>',
    lemon: '<ellipse cx="12" cy="12" rx="8" ry="6"/><path d="M12 6v12M5 10l14 4"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  };
  const ico = (name, cls = '') => `<svg class="dg-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[name] || ''}</svg>`;
  const yes = `<span class="dg-yes" aria-label="${T('ja', 'yes')}">✓</span>`;
  const no = `<span class="dg-no" aria-label="${T('nee', 'no')}">✗</span>`;
  const none = `<span class="dg-none" aria-label="${T('niet genoemd', 'not mentioned')}">–</span>`;
  const mark = v => v === 1 ? yes : v === 0 ? no : v === 2 ? `<span class="dg-part" aria-label="${T('deels', 'partly')}">~</span>` : none;

  // ---------- figure 1: anatomy of a knife (p. 12) ----------
  const PARTS = [
    [1, 'Punt', 'Tip', 438, 92, 438, 30],
    [2, 'Ophangoog', 'Hanging hole', 388, 86, 392, 30],
    [3, 'Lemmet', 'Blade', 318, 82, 318, 30],
    [4, 'Snede', 'Cutting edge', 300, 126, 300, 176],
    [5, 'Kuiltjes', 'Dimples', 252, 112, 246, 176],
    [6, 'Krop', 'Bolster', 192, 92, 196, 30],
    [7, 'Angel', 'Tang', 140, 95, 150, 30],
    [8, 'Heft', 'Handle', 96, 100, 100, 30],
    [9, 'Vingergreep', 'Finger grip', 120, 121, 150, 176],
    [10, 'Sluitstuk', 'End cap', 22, 98, 36, 176],
  ];
  function knifeAnatomy() {
    const edges = [
      ['serrated', 'Kartel', 'Serrated'], ['wavy', 'Golfkartel', 'Wavy serrated'], ['micro', 'Microkartel', 'Micro-serrated'],
      ['double', 'Dubbele kartel', 'Double serrated'], ['kai', 'KAI-kartel', 'KAI serrated'], ['convex', 'Bol', 'Convex'],
      ['straight', 'Recht', 'Straight'], ['hollow', 'Hol', 'Hollow']];
    const svg = `<svg class="dg-knife" viewBox="0 0 470 200" role="img" aria-label="${esc(T('Onderdelen van een mes', 'Parts of a knife'))}">
      <path class="k-blade" d="M198 72 L392 72 Q440 74 462 98 Q420 128 330 128 L198 128 Z"/>
      <path class="k-edge" d="M198 128 L330 128 Q420 128 462 98"/>
      <rect class="k-bolster" x="186" y="66" width="16" height="68" rx="5"/>
      <path class="k-handle" d="M28 82 L186 80 L186 120 L170 120 Q160 128 150 120 Q140 128 130 120 Q120 128 110 120 L28 118 Q16 100 28 82 Z"/>
      <line class="k-tang" x1="36" y1="100" x2="182" y2="100"/>
      <circle class="k-rivet" cx="70" cy="100" r="4"/><circle class="k-rivet" cx="110" cy="100" r="4"/><circle class="k-rivet" cx="150" cy="100" r="4"/>
      <rect class="k-cap" x="16" y="86" width="10" height="28" rx="4"/>
      <circle class="k-hole" cx="388" cy="86" r="5"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<ellipse class="k-hole" cx="${222 + i * 14}" cy="112" rx="5" ry="3"/>`).join('')}
      ${PARTS.map(([n, , , tx, ty, mx, my]) => `<line class="k-lead" x1="${mx}" y1="${my}" x2="${tx}" y2="${ty}"/><circle class="k-dot" cx="${tx}" cy="${ty}" r="3"/>
        <circle class="k-num-bg" cx="${mx}" cy="${my}" r="13"/><text class="k-num" x="${mx}" y="${my + 5}">${n}</text>`).join('')}
    </svg>`;
    return `<div class="dg">${head('Onderdelen van een mes', 'Parts of a knife')}
      <div class="dg-scroll">${svg}</div>
      <ol class="dg-legend">${PARTS.map(([n, nl, en]) => `<li><span class="num">${n}</span>${dual(nl, en)}</li>`).join('')}</ol>
      <div class="dg-two">
        <div class="dg-box"><div class="dg-box-t">${dual('Gestanst lemmet', 'Stamped blade')}</div><ul><li>${esc(T('lichter', 'lighter'))}</li><li>${esc(T('goedkoper', 'cheaper'))}</li></ul></div>
        <div class="dg-box"><div class="dg-box-t">${dual('Gesmeed lemmet', 'Forged blade')}</div><ul><li>${esc(T('harder', 'harder'))}</li><li>${esc(T('langer scherp', 'stays sharp longer'))}</li></ul></div>
      </div>
      <div class="dg-sub">${esc(T('Soorten snede', 'Types of cutting edge'))}</div>
      <div class="dg-edges">${edges.map(([k, nl, en]) => `<div class="dg-edge">${edgeSVG(k)}${dual(nl, en)}</div>`).join('')}</div>
      <div class="dg-two">
        <div class="dg-box">${ico('hand')}<div><b>${esc(T('Recht en hol', 'Straight and hollow'))}</b><p>${esc(T('uit de hand snijden', 'cut freehand'))}</p></div></div>
        <div class="dg-box">${ico('stone')}<div><b>${esc(T('Bol', 'Convex'))}</b><p>${esc(T('op de plank snijden', 'cut on the board'))}</p></div></div>
      </div>
      <div class="dg-box wide"><b>${esc(T('Kuiltjes', 'Dimples'))}</b><p>${esc(T('Zorgen voor lucht tussen lemmet en product: extra dun snijden zonder kleven.', 'Let air in between the blade and the food: extra-thin slices without sticking.'))}</p></div>
      ${src(12)}</div>`;
  }
  function edgeSVG(kind) {
    const w = 64, m = 9; let d = '';
    if (kind === 'straight') d = `M2 ${m}H${w - 2}`;
    else if (kind === 'convex') d = `M2 ${m}Q${w / 2} ${m - 9} ${w - 2} ${m}`;
    else if (kind === 'hollow') d = `M2 ${m}Q${w / 2} ${m + 9} ${w - 2} ${m}`;
    else if (kind === 'wavy') { d = `M2 ${m}`; for (let x = 2; x <= w - 2; x += 1) d += `L${x} ${(m + Math.sin((x - 2) / (w - 4) * Math.PI * 6) * 4).toFixed(1)}`; }
    else if (kind === 'micro') { d = `M2 ${m}`; let up = true; for (let x = 2; x <= w - 2; x += 2.5) { d += `L${x} ${m + (up ? -1.6 : 1.6)}`; up = !up; } }
    else { const p = kind === 'kai' ? 6 : 8; let x = 2, i = 0; d = `M2 ${m - 4}`; while (x + p <= w - 1) { const dep = kind === 'double' && i % 2 ? 2 : 7; d += `Q${x + p / 2} ${m + dep} ${x + p} ${m - 4}`; x += p; i++; } }
    return `<svg class="dg-edge-svg" viewBox="0 0 ${w} 18" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  // ---------- figure 2: knives for general use, with blade lengths (p. 13) ----------
  const LENGTHS = [
    ['Gladde snede', 'Plain edge', 'pointed', [
      ['Schilmes', 'Paring knife', 5, 9], ['Tourneermes', 'Tourné knife', 5, 9], ['Officemes', 'Office knife', 9, 11],
      ['Universeel mes', 'Utility knife', 12, 15], ['Santoku', 'Santoku', 11, 19], ['Nakiri', 'Nakiri', 14, 20],
      ['Chinees hakmes', 'Chinese cleaver', 18, 20], ['Vleesmes', 'Carving knife', 15, 26],
      ['Slagersmes / rauw vleesmes', "Butcher's / raw meat knife", 16, 25], ['Koksmes', "Chef's knife", 16, 27]]],
    ['Kartelsnede', 'Serrated edge', 'serrated', [
      ['Worst- / tomatenmes', 'Sausage / tomato knife', 10, 15], ['Bagel- / sandwichmes', 'Bagel / sandwich knife', 16, 16],
      ['Broodmes', 'Bread knife', 16, 24], ['Superslicer / bakkersmes / kapselmes', "Superslicer / baker's knife", 25, 27]]],
    ['Hakmes', 'Cleavers', 'cleaver', [
      ['Hakbijl', 'Cleaver', 14, 18], ['Deba', 'Deba', 11, 21], ['Vishandelaarsmes', "Fishmonger's knife", 30, 30]]],
  ];
  function knifeLengths() {
    const max = 30, ticks = [0, 5, 10, 15, 20, 25, 30];
    const ruler = `<div class="dg-ruler">${ticks.map(t => `<span style="left:${t / max * 100}%">${t}</span>`).join('')}</div>`;
    return `<div class="dg">${head('Messen voor algemeen gebruik', 'Knives for general use', T('Lengte van het lemmet in cm. De balk loopt van de kortste tot de langste maat.', 'Blade length in cm. The bar runs from the shortest to the longest size.'))}
      ${LENGTHS.map(([gnl, gen, style, list]) => `<div class="dg-group"><div class="dg-sub">${dual(gnl, gen)}</div>
        <div class="dg-lengths">${ruler}${list.map(([nl, en, a, b]) => `<div class="dg-len">
          <div class="dg-len-name">${dual(nl, en)}<span class="dg-cm">${a === b ? a : `${a}–${b}`} cm</span></div>
          <div class="dg-len-track"><i class="dg-len-bar ${style}" style="left:${a / max * 100}%;width:${Math.max(1.5, (b - a) / max * 100)}%"></i><i class="dg-len-ghost" style="width:${a / max * 100}%"></i></div></div>`).join('')}</div></div>`).join('')}
      ${src(13)}</div>`;
  }

  // ---------- figure 3: knives for specific use (p. 14) ----------
  const SPECIFIC = [
    ['🥩', 'Vlees', 'Meat', [['Hammes', 'Ham knife'], ['Steakmes', 'Steak knife'], ['Trancheermes', 'Carving knife'], ['Uitbeenmes', 'Boning knife']]],
    ['🐟', 'Vis', 'Fish', [['Fileermes', 'Filleting knife'], ['Krab- en kreeftmes', 'Crab and lobster knife'], ['Oestermes', 'Oyster knife'], ['Sashimimes / yanagiba', 'Sashimi knife / yanagiba'], ['Zalmmes', 'Salmon knife']]],
    ['🥕', 'Groente en fruit', 'Fruit and vegetables', [['Decoratiemes', 'Decorating knife'], ['Dunschiller', 'Peeler'], ['Grapefruitmes', 'Grapefruit knife'], ['Kastanjemes', 'Chestnut knife']]],
    ['🧀', 'Overig', 'Other', [['Paddenstoelenmes', 'Mushroom knife'], ['Kaasmes', 'Cheese knife'], ['Champagnesabel', 'Champagne sabre'], ['Wiegemes', 'Mezzaluna (rocking knife)']]],
  ];
  function specificKnives() {
    return `<div class="dg">${head('Messen voor specifiek gebruik', 'Knives for specific use')}
      <div class="dg-cats">${SPECIFIC.map(([e, nl, en, list]) => `<div class="dg-cat"><div class="dg-cat-h"><span class="dg-emoji">${e}</span>${dual(nl, en)}<span class="dg-count">${list.length}</span></div>
        <div class="dg-chips">${list.map(([a, b]) => `<span class="dg-chip">${dual(a, b)}</span>`).join('')}</div></div>`).join('')}</div>
      ${src(14)}</div>`;
  }

  // ---------- figure 4: categories and types of pans (p. 18) ----------
  const PANS = [
    ['pan', 'Bakpannen', 'Frying pans', true, [['Koekenpan', 'Frying pan'], ['Hapjes- / sauteerpan', 'Sauté pan'], ['Crêpe- / pannenkoekenpan', 'Crêpe / pancake pan'], ['Poffertjespan', 'Poffertjes pan'], ['Paellapan', 'Paella pan'], ['Vispan', 'Fish pan'], ['Grillpan', 'Grill pan'], ['Bakplaat / plancha grill', 'Griddle / plancha grill'], ['Wok', 'Wok']]],
    ['pot', 'Kookpannen', 'Cooking pots', true, [['Kookpan', 'Stockpot'], ['Soeppan', 'Soup pot'], ['Stoompan', 'Steamer'], ['Sappan', 'Juice extractor pan'], ['Jampan', 'Jam pan'], ['Pastapan', 'Pasta pot'], ['Aspergepan', 'Asparagus pot'], ['Mosselpan', 'Mussel pot'], ['Frituurpan', 'Deep-fat fryer pot'], ['Snelkookpan', 'Pressure cooker'], ['Cataplana', 'Cataplana']]],
    ['sauce', 'Sauspannen', 'Saucepans', false, [['Steelpan', 'Saucepan with handle'], ['Klassieke sauspan', 'Classic sauce pan'], ['Moderne sauspan', 'Modern sauce pan'], ['Melkpan', 'Milk pan'], ['Au-bain-mariepan', 'Bain-marie pan'], ['Fonduepan / caquelon', 'Fondue pot / caquelon']]],
    ['casserole', 'Braadpannen', 'Casseroles', false, [['Braadpan', 'Casserole'], ['Lage braadpan', 'Shallow casserole'], ['Dutch oven', 'Dutch oven'], ['Faitout', 'Faitout'], ['Braadslede', 'Roasting tin'], ['Tajine', 'Tagine']]],
    ['kettle', 'Specials', 'Specials', false, [['Fluitketel', 'Whistling kettle'], ['Waterketel', 'Kettle'], ['Kastanjepan', 'Chestnut pan'], ['Rookpan', 'Smoker pan'], ['Popcornpan', 'Popcorn pan'], ['Crock-Pot (slowcooker)', 'Crock-Pot (slow cooker)']]],
  ];
  function panTypes() {
    return `<div class="dg">${head('Soorten pannen', 'Types of pans', T('Vijf groepen. De bakpannen en kookpannen zijn het grootst.', 'Five groups. Frying pans and cooking pots are the largest.'))}
      <div class="dg-cats">${PANS.map(([icon, nl, en, big, list]) => `<div class="dg-cat ${big ? 'big' : ''}"><div class="dg-cat-h">${ico(icon, 'round')}${dual(nl, en)}<span class="dg-count">${list.length}</span></div>
        <div class="dg-chips">${list.map(([a, b]) => `<span class="dg-chip">${dual(a, b)}</span>`).join('')}</div></div>`).join('')}</div>
      ${src(18)}</div>`;
  }

  // ---------- infographic: heat sources (p. 22-23) ----------
  // 1 = advantage in the booklet, 0 = disadvantage, null = the booklet does not say
  const HEAT = [['flame', 'Gas', 'Gas'], ['coil', 'Elektrisch', 'Electric'], ['glass', 'Keramisch', 'Ceramic'], ['magnet', 'Inductie', 'Induction']];
  const HEAT_ROWS = [
    ['Warmte goed regelbaar', 'Heat easy to control', [1, 0, null, null]],
    ['Snel warm', 'Heats up quickly', [1, 0, null, 1]],
    ['Snel weer koud', 'Cools down quickly', [1, 0, 0, null]],
    ['Veilig', 'Safe', [0, 1, null, 1]],
    ['Zuinig met energie', 'Energy efficient', [0, 0, 0, 1]],
    ['Restwarmte te gebruiken', 'Residual heat can be used', [null, null, 1, null]],
    ['(Vrijwel) alle pannen', '(Almost) all pans', [1, 1, 1, 0]],
  ];
  function heatSources() {
    return `<div class="dg">${head('Warmtebronnen vergeleken', 'Heat sources compared', T('✓ voordeel en ✗ nadeel volgens het boekje; – staat er niet bij.', '✓ advantage and ✗ disadvantage according to the booklet; – not mentioned.'))}
      <div class="dg-scroll"><table class="dg-matrix"><thead><tr><th></th>${HEAT.map(([i, nl, en]) => `<th>${ico(i, 'round')}${dual(nl, en)}</th>`).join('')}</tr></thead>
      <tbody>${HEAT_ROWS.map(([nl, en, v]) => `<tr><th scope="row">${esc(T(nl, en))}</th>${v.map(x => `<td>${mark(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="dg-box wide accent">${ico('magnet')}<div><b>${esc(T('Inductie', 'Induction'))}</b><p>${esc(T('De pan moet magnetisch zijn en een vlakke bodem hebben, anders wordt hij niet warm. Alle pannen kunnen op gas.', 'The pan must be magnetic and have a flat base, otherwise it does not heat up. All pans can go on gas.'))}</p></div></div>
      <div class="dg-box wide">${ico('flame')}<div><b>${esc(T('Van gas naar een andere kookplaat?', 'Moving from gas to another hob?'))}</b><p>${esc(T('Op gas kan de bodem licht kromtrekken, dan is er geen goed contact meer. Demeyere, Cristel, Le Creuset, Spring en Fissler (behalve de San Francisco-set) kunnen eerst op gas en daarna op inductie.', 'On gas the base can warp slightly, so it no longer makes good contact. Demeyere, Cristel, Le Creuset, Spring and Fissler (except the San Francisco set) can be used on gas first and on induction later.'))}</p></div></div>
      ${src('22-23')}</div>`;
  }

  // ---------- infographic: pan materials and heat sources (p. 24-27) ----------
  const MATERIALS = [
    ['Aluminium', 'Aluminium', [1, 1, 1, 2], 'Alleen aluminium kan niet op inductie; de meeste pannen hebben een extra magnetische laag.', 'Aluminium alone cannot go on induction; most pans have an extra magnetic layer.', 'Gastrolux, Cristel, Fissler'],
    ['Plaatstaal', 'Carbon steel', [1, 1, 2, 2], 'Kan in principe op alles, maar trekt krom als hij te snel heet wordt. Vooral voor gas en elektrisch.', 'Can in principle go on anything, but warps if heated too quickly. Mainly for gas and electric.', 'Turk, De Buyer, Vaello'],
    ['Roestvrij staal', 'Stainless steel', [1, 1, 1, 1], 'Op alle warmtebronnen te gebruiken.', 'Can be used on all heat sources.', 'Inoxibar, Demeyere, Fissler, Spring, Cristel'],
    ['Gietijzer', 'Cast iron', [1, 1, 1, 1], 'Geschikt voor elke warmtebron.', 'Suitable for every heat source.', 'Le Creuset, Victoria, Chasseur, Lodge, The Bastard'],
  ];
  function materials() {
    return `<div class="dg">${head('Welk materiaal op welke warmtebron?', 'Which material on which heat source?', T('✓ geschikt · ~ met een kanttekening (zie de tekst)', '✓ suitable · ~ with a caveat (see the text)'))}
      <div class="dg-scroll"><table class="dg-matrix"><thead><tr><th></th>${HEAT.map(([i, nl, en]) => `<th>${ico(i, 'round')}${dual(nl, en)}</th>`).join('')}</tr></thead>
      <tbody>${MATERIALS.map(([nl, en, v]) => `<tr><th scope="row">${esc(T(nl, en))}</th>${v.map(x => `<td>${mark(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="dg-mats">${MATERIALS.map(([nl, en, , tnl, ten, brands]) => `<div class="dg-box"><div class="dg-box-t">${dual(nl, en)}</div><p>${esc(T(tnl, ten))}</p><p class="dg-brands">${esc(brands)}</p></div>`).join('')}</div>
      <p class="dg-note">${esc(T('Het ene materiaal is niet beter dan het andere: ze hebben andere eigenschappen en toepassingen.', 'No material is better than another: they have different properties and uses.'))}</p>
      ${src('24-26')}</div>`;
  }
  function seasoning() {
    const steps = [
      ['soap', 'Beschermlaag eraf met sodasop en schuurspons (alleen de eerste keer)', 'Remove the protective layer with soda water and a scouring pad (first time only)'],
      ['oil', 'Binnen en buiten dun invetten met zonnebloem- of arachideolie', 'Grease inside and out with a thin layer of sunflower or peanut oil'],
      ['oven', 'Ondersteboven in de oven, mee opwarmen tot 200+ °C', 'Upside down in the oven, heat up with it to 200+ °C'],
      ['cal', 'Dan 60 minuten laten "bakken"', 'Then let it "bake" for 60 minutes'],
      ['drop', 'Oven uit, pan in de oven laten afkoelen. Klaar!', 'Oven off, let the pan cool in the oven. Ready!'],
    ];
    const care = [
      [1, 'Heet water en een borstel', 'Hot water and a brush'], [0, 'Nooit sop', 'Never washing-up liquid'],
      [0, 'Nooit in water laten staan', 'Never leave it in water'], [0, 'Nooit in de vaatwasser', 'Never in the dishwasher'],
      [1, 'Na drogen inwrijven met olie', 'Rub with oil after drying'], [0, 'Niet erg geschikt voor zure gerechten', 'Not very suitable for acidic dishes']];
    return `<div class="dg">${head('Plaatstaal inbranden', 'Seasoning carbon steel', T('Voor het eerste gebruik. Hoe vaker de pan gebruikt wordt, hoe beter hij bakt.', 'Before first use. The more the pan is used, the better it fries.'))}
      <ol class="dg-steps">${steps.map(([i, nl, en], k) => `<li><span class="dg-step-n">${k + 1}</span>${ico(i, 'round')}<span>${esc(T(nl, en))}</span></li>`).join('')}</ol>
      <div class="dg-sub">${esc(T('Schoonmaken', 'Cleaning'))}</div>
      <div class="dg-dos">${care.map(([ok, nl, en]) => `<span class="dg-do ${ok ? 'ok' : 'bad'}">${ok ? yes : no} ${esc(T(nl, en))}</span>`).join('')}</div>
      ${src(24)}</div>`;
  }

  // ---------- infographic: knife care (p. 15-16) ----------
  function knifeCare() {
    const angle = (deg, nl, en) => {
      const r = 70, a = deg * Math.PI / 180, x = 10 + r * Math.cos(a), y = 80 - r * Math.sin(a);
      return `<div class="dg-angle"><svg viewBox="0 0 100 90" aria-hidden="true"><path class="ang-fill" d="M10 80 L80 80 L${x.toFixed(1)} ${y.toFixed(1)} Z"/><path class="ang-line" d="M10 80 L88 80 M10 80 L${(10 + 78 * Math.cos(a)).toFixed(1)} ${(80 - 78 * Math.sin(a)).toFixed(1)}"/>
        <path class="ang-arc" d="M44 80 A34 34 0 0 0 ${(10 + 34 * Math.cos(a)).toFixed(1)} ${(80 - 34 * Math.sin(a)).toFixed(1)}"/></svg><b>${deg}°</b>${dual(nl, en)}</div>`;
    };
    const tools = [['Staal', 'Steel'], ['Keramiek', 'Ceramic'], ['Diamant', 'Diamond']];
    return `<div class="dg">${head('Messen onderhouden', 'Caring for knives')}
      <div class="dg-two">
        <div class="dg-box tall">${ico('rod', 'round')}<div class="dg-box-t">${dual('Aanzetten', 'Honing')}</div><div class="dg-freq">± ${esc(T('1× per maand', 'once a month'))}</div>
          <ul><li>${esc(T('met een aanzetstaal', 'with a honing steel'))}</li><li>${esc(T('neemt geen materiaal af: het mes slijt niet', 'removes no material: the knife does not wear'))}</li><li>${esc(T('houdt een goed mes langer scherp', 'keeps a good knife sharp for longer'))}</li></ul></div>
        <div class="dg-box tall">${ico('stone', 'round')}<div class="dg-box-t">${dual('Slijpen', 'Sharpening')}</div><div class="dg-freq">± ${esc(T('1× per jaar', 'once a year'))}</div>
          <ul><li>${esc(T('doortrekslijper, slijpstaaf, wetsteen of elektrische slijpmachine', 'pull-through sharpener, sharpening rod, whetstone or electric sharpener'))}</li><li>${esc(T('slijpt de buitenkant van het blad eraf', 'grinds off the outside of the blade'))}</li><li>${esc(T('maakt een bot mes weer scherp', 'makes a blunt knife sharp again'))}</li></ul></div>
      </div>
      <div class="dg-sub">${esc(T('Slijphoek: altijd onder dezelfde hoek aanzetten en slijpen', 'Sharpening angle: always hone and sharpen at the same angle'))}</div>
      <div class="dg-two">${angle(22, 'Europese messen', 'European knives')}${angle(16, 'Aziatische messen', 'Asian knives')}</div>
      <div class="dg-sub">${esc(T('Welk aanzetstaal of welke slijper?', 'Which honing steel or sharpener?'))}</div>
      <div class="dg-scroll"><table class="dg-matrix"><thead><tr><th></th>${tools.map(([nl, en]) => `<th>${dual(nl, en)}</th>`).join('')}</tr></thead><tbody>
        <tr><th scope="row">${esc(T('Europese messen', 'European knives'))}</th><td>${yes}</td><td>${yes}</td><td>${yes}</td></tr>
        <tr><th scope="row">${esc(T('Aziatische messen', 'Asian knives'))}</th><td>${no}</td><td>${yes}</td><td>${yes}</td></tr></tbody></table></div>
      <p class="dg-note">${esc(T('Vuistregel: hoe hoger de HRC van het mes, hoe harder het aanzetstaal of de slijper moet zijn. Staal is zachter dan Aziatische messen.', 'Rule of thumb: the higher the knife\'s HRC, the harder the honing steel or sharpener must be. Steel is softer than Asian knives.'))}</p>
      <div class="dg-sub">${esc(T('Schoonmaken', 'Cleaning'))}</div>
      <div class="dg-dos"><span class="dg-do bad">${no} ${esc(T('Nooit in de vaatwasser', 'Never in the dishwasher'))}</span><span class="dg-do bad">${no} ${esc(T('Niet lang in water laten liggen', 'Do not leave in water'))}</span>
        <span class="dg-do ok">${yes} ${esc(T('Met de hand afwassen', 'Wash by hand'))}</span><span class="dg-do ok">${yes} ${esc(T('Carbon: na iets zuurs direct afspoelen', 'Carbon: rinse straight after cutting something acidic'))}</span>
        <span class="dg-do ok">${yes} ${esc(T('Carbon: regelmatig inoliën', 'Carbon: oil regularly'))}</span></div>
      ${src(15)}</div>`;
  }

  // ---------- infographic: bean-to-cup vs semi-automatic (p. 44) ----------
  function coffeeTypes() {
    const steps = [['beans', 'Bonen malen', 'Grind beans'], ['scale', 'Koffie doseren', 'Dose coffee'], ['drop', 'Extractie', 'Extraction'], ['milk', 'Melk opschuimen', 'Froth milk']];
    const auto = [1, 1, 1, 1];
    const semi = [['Zelf', 'You'], ['Zelf, in de portafilter', 'You, into the portafilter'], ['Zelf: knop of hendel', 'You: button or lever'], ['Zelf, met stoompijpje (sommige)', 'You, with steam wand (some)']];
    const col = (title, sub, icon, cells, pros, brands) => `<div class="dg-col"><div class="dg-col-h">${ico(icon, 'round big')}<div>${title}<p>${esc(sub)}</p></div></div>
      <ol class="dg-flow">${steps.map(([i, nl, en], k) => `<li>${ico(i)}<span class="dg-flow-n">${esc(T(nl, en))}</span><span class="dg-flow-who ${cells === auto ? 'machine' : 'you'}">${cells === auto ? esc(T('Machine', 'Machine')) : esc(T(cells[k][0], cells[k][1]))}</span></li>`).join('')}</ol>
      <ul class="dg-pros">${pros.map(([nl, en]) => `<li>${yes} ${esc(T(nl, en))}</li>`).join('')}</ul><p class="dg-brands">${esc(brands)}</p></div>`;
    return `<div class="dg">${head('Volautomaat of halfautomaat?', 'Bean-to-cup or semi-automatic?', T('Het verschil: hoeveel de machine doet en hoeveel controle jij hebt.', 'The difference: how much the machine does and how much control you have.'))}
      <div class="dg-two">${col(dual('Volautomaat', 'Bean-to-cup'), T('Eén druk op de knop', 'One press of a button'), 'robot', auto,
        [['Gemakkelijk te gebruiken', 'Easy to use'], ['Consistente smaak', 'Consistent taste'], ['Ingebouwde koffiemolen', 'Built-in grinder']], 'Jura, Nivona, SMEG')}
      ${col(dual('Halfautomaat', 'Semi-automatic'), T('Ook wel espressomachine', 'Also called espresso machine'), 'hand', semi,
        [['Controle over het zetproces', 'Control over brewing'], ['Barista-ervaring', 'Barista experience'], ['Ruimte om te experimenteren', 'Room to experiment']], 'ECM, Isomac, La Pavoni, Profitec, Sage, SMEG')}</div>
      ${src(44)}</div>`;
  }

  const FIGURES = { 'booklet-fig1-mes-anatomie': knifeAnatomy, 'booklet-fig2-messen-algemeen': knifeLengths, 'booklet-fig3-messen-specifiek': specificKnives, 'booklet-fig4-pannen': panTypes };
  // infographics shown on a topic page (above its parts) or on one part (by the heading's Dutch text)
  const TOPICS = { warmtebronnen: heatSources, 'pannen-materialen': materials, 'messen-onderhoud': knifeCare, koffiemachines: coffeeTypes };
  const PARTS_DG = { 'pannen-materialen|Plaatstaal': seasoning };

  window.Diagrams = {
    setLang(l) { LANG = l; },
    hasFigure: id => !!FIGURES[id],
    figure: id => (FIGURES[id] ? FIGURES[id]() : ''),
    topic: id => (TOPICS[id] ? TOPICS[id]() : ''),
    part: (topicID, headingNL) => (PARTS_DG[topicID + '|' + headingNL] ? PARTS_DG[topicID + '|' + headingNL]() : ''),
  };
})();
