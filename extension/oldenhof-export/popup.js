const $ = id => document.getElementById(id);
let tab, mode = 'list', timer;
const inTab = (func, args = []) => chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args }).then(r => r[0]?.result);
const ensureRunner = () => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['runner.js'] });
const links = () => $('links').value.split(/\s+/).filter(u => /^https:\/\/www\.kookwinkel\.nl\//.test(u));

function show(which) { mode = which; $('tabList').className = which === 'list' ? 'on' : 'ghost'; $('tabPaste').className = which === 'paste' ? 'on' : 'ghost'; $('paneList').hidden = which !== 'list'; $('panePaste').hidden = which !== 'paste'; }
$('tabList').onclick = () => show('list'); $('tabPaste').onclick = () => show('paste');
$('links').oninput = () => { $('count').textContent = links().length + ' links'; };

async function refresh() {
  const s = await inTab(() => window.__ohExport && window.__ohExport.status());
  if (!s) { $('setup').hidden = false; $('run').hidden = true; return; }
  const active = s.running || s.phase === 'blocked';
  $('setup').hidden = active; $('run').hidden = !active && s.phase !== 'finished' && s.phase !== 'stopped';
  if (!$('run').hidden && !s.running) { $('setup').hidden = false; }
  const pct = s.total ? Math.round(s.done / s.total * 100) : 0;
  $('fill').style.width = pct + '%';
  $('nums').innerHTML = `<b>${s.done}</b> van ${s.total} · opgeslagen <b>${s.saved}</b> · geen product ${s.skippedNotProduct} · mislukt ${s.failed} · bestanden ${s.files}`;
  $('msg').textContent = s.message || ''; $('msg').className = 'msg' + (s.blocked ? ' warn' : '');
  $('pause').textContent = s.paused ? 'Verder' : 'Pauze';
  $('pause').disabled = !s.running;
}
async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const ok = tab && /^https:\/\/www\.kookwinkel\.nl\//.test(tab.url || '');
  $('where').textContent = ok ? 'Tabblad: ' + new URL(tab.url).pathname : 'Open eerst een pagina van www.kookwinkel.nl in dit tabblad.';
  $('start').disabled = $('resume').disabled = !ok;
  if (!ok) return;
  await ensureRunner();
  const n = await inTab(() => window.__ohExport.countLinks());
  $('paneList').innerHTML = `<p>Open een categorie op kookwinkel.nl (bijv. <b>Pannen</b>). De extensie verzamelt alle producten op deze pagina en de volgende pagina's.</p><p>Op deze pagina zie ik nu <b>${n}</b> producten.</p>`;
  const sv = await inTab(() => window.__ohExport.hasSaved());
  $('resumeInfo').textContent = sv.done ? `Al gedaan en opgeslagen: ${sv.done} pagina's.` : '';
  timer = setInterval(refresh, 1000); refresh();
}
const opts = () => ({ label: $('label').value, delayMs: +$('speed').value, urls: mode === 'paste' ? links() : [] });
$('start').onclick = async () => {
  if (mode === 'paste' && !links().length) { $('count').textContent = 'Plak eerst links.'; return; }
  await inTab(o => { window.__ohExport.reset(); window.__ohExport.start(o); }, [opts()]);
  refresh();
};
$('resume').onclick = async () => { const o = opts(); o.resume = true; o.useSaved = mode === 'list' ? false : !o.urls.length; await inTab(o => window.__ohExport.start(o), [o]); refresh(); };
$('reset').onclick = async () => { await inTab(() => window.__ohExport.reset()); $('resumeInfo').textContent = 'Teller teruggezet.'; };
$('pause').onclick = async () => { const s = await inTab(() => window.__ohExport.status()); await inTab(p => p ? window.__ohExport.resume() : window.__ohExport.pause(), [s.paused]); refresh(); };
$('stop').onclick = async () => { await inTab(() => window.__ohExport.stop()); refresh(); };
init();
