/* Team data for the Oldenhof web app.
   - Notes and out-of-stock flags: local-first (saved on the phone, works offline), synced to Supabase when online.
   - Accounts: kept in Supabase (shared by every phone). PINs are checked by the database, never stored here.
     A login gives a session token; with "stay logged in" it is remembered on this phone.
   - Quiz scores: saved through the database; finished quizzes wait in a queue while offline. */
(function () {
  const K = { notes: 'oh.notes', flags: 'oh.flags', queue: 'oh.queue', since: 'oh.since', user: 'oh.user', team: 'oh.team',
              session: 'oh.session', accounts: 'oh.accounts', quizq: 'oh.quizq', quiz: 'oh.quizres' };
  const store = (s => { try { s.setItem('oh.t', '1'); s.removeItem('oh.t'); return s; } catch { return null; } });
  const LS = store(window.localStorage), SS = store(window.sessionStorage);
  const read = (k, d, s = LS) => { try { const v = s && s.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const write = (k, v, s = LS) => { try { if (!s) return; if (v == null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch {} };
  const cfg = window.OLDENHOF_CONFIG || {};
  const remote = !!(cfg.supabaseURL && cfg.supabaseKey);
  const listeners = new Set();
  let notes = read(K.notes, {});      // id -> note
  let flags = read(K.flags, {});      // variantID -> flag
  let queue = read(K.queue, []);      // [{table,row}]
  let quizQueue = read(K.quizq, []);  // finished quizzes not sent yet
  let quizResults = read(K.quiz, []); // last known results (own, or all for managers)
  let accounts = read(K.accounts, null);
  let session = read(K.session, null) || read(K.session, null, SS);   // {token, account}
  let state = { syncing: false, lastSync: read(K.since, null), error: null, accountsLoaded: !!accounts };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const now = () => new Date().toISOString();
  const save = () => { write(K.notes, notes); write(K.flags, flags); write(K.queue, queue); write(K.quizq, quizQueue); write(K.quiz, quizResults); };
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });

  const toRow = {
    notes: n => ({ id: n.id, product_id: n.productID, variant_id: n.variantID, text: n.text, author: n.author, account_id: n.accountID || null,
                   created_at: n.createdAt, updated_at: n.updatedAt, deleted: !!n.deleted }),
    stock_flags: f => ({ variant_id: f.variantID, product_id: f.productID, out_of_stock: f.out, author: f.author, account_id: f.accountID || null,
                         comment: f.comment || null, updated_at: f.updatedAt })
  };
  const fromRow = {
    notes: r => ({ id: r.id, productID: r.product_id, variantID: r.variant_id, text: r.text, author: r.author, accountID: r.account_id,
                   createdAt: r.created_at, updatedAt: r.updated_at, deleted: r.deleted }),
    stock_flags: r => ({ variantID: r.variant_id, productID: r.product_id, out: r.out_of_stock, author: r.author, accountID: r.account_id,
                         comment: r.comment, updatedAt: r.updated_at })
  };

  const teamCode = () => cfg.teamCode || read(K.team, '');
  function headers(extra) {
    return Object.assign({ apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey,
      'Content-Type': 'application/json', 'x-team-code': teamCode() }, extra || {});
  }
  async function rpc(name, args) {
    const res = await fetch(`${cfg.supabaseURL}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(), body: JSON.stringify(args || {}) });
    if (res.status === 404) throw new Error('setup');           // the accounts SQL has not been run yet
    if (!res.ok) throw new Error(`server ${res.status}`);
    return res.json();
  }

  // ---------- sync of notes + flags ----------
  async function verify() {
    if (state.verified) return;
    const res = await fetch(`${cfg.supabaseURL}/rest/v1/rpc/check_team`, { method: 'POST', headers: headers(), body: '{}' });
    if (res.ok && (await res.json()) === false) throw new Error('teamcode');
    if (res.ok) state.verified = true;
  }
  async function push() {
    while (queue.length) {
      const batch = queue.slice(0, 50);
      const byTable = {};
      batch.forEach(op => (byTable[op.table] = byTable[op.table] || []).push(op.row));
      for (const t of Object.keys(byTable)) {
        // one row per key: the last change wins
        const key = t === 'notes' ? 'id' : 'variant_id';
        const rows = Object.values(Object.fromEntries(byTable[t].map(r => [r[key], r])));
        const res = await fetch(`${cfg.supabaseURL}/rest/v1/${t}`, { method: 'POST',
          headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) });
        if (!res.ok) throw new Error(`Opslaan mislukt (${res.status})`);
      }
      queue = queue.slice(batch.length); save();
    }
    while (quizQueue.length && session) {
      const q = quizQueue[0];
      const r = await rpc('add_quiz_result', { p_token: session.token, p_id: q.id, p_quiz_id: q.quizID, p_score: q.score, p_total: q.total, p_at: q.date });
      if (r && r.error === 'login') { endSession(); break; }
      quizQueue.shift(); save();
    }
  }
  async function pull() {
    // Always fetch the full (small) tables: a note written offline keeps its original time,
    // so an "only newer than my last sync" filter could skip it.
    const started = now();
    for (const t of ['notes', 'stock_flags']) {
      const res = await fetch(`${cfg.supabaseURL}/rest/v1/${t}?select=*&order=updated_at.asc&limit=5000`, { headers: headers() });
      if (!res.ok) throw new Error(`Ophalen mislukt (${res.status})`);
      for (const r of await res.json()) {
        const x = fromRow[t](r);
        if (t === 'notes') { if (!notes[x.id] || notes[x.id].updatedAt <= x.updatedAt) notes[x.id] = x; }
        else if (!flags[x.variantID] || flags[x.variantID].updatedAt <= x.updatedAt) flags[x.variantID] = x;
      }
    }
    state.lastSync = started; write(K.since, started); save();
  }
  async function pullAccounts() {
    const list = await rpc('account_list');
    accounts = Array.isArray(list) ? list : []; state.accountsLoaded = true; write(K.accounts, accounts);
    if (session) {
      const me = await rpc('me', { p_token: session.token });
      if (!me) endSession();                       // account deleted or logged out elsewhere
      else { session.account = me; saveSession(); }
      if (session) await pullQuiz();
    }
  }
  async function pullQuiz() {
    const r = await rpc('quiz_results_for', { p_token: session.token });
    if (r && r.results) { quizResults = r.results; save(); }
  }
  async function sync() {
    if (!remote || !teamCode() || state.syncing || !navigator.onLine) return;
    state.syncing = true; emit();
    try { await verify(); await pullAccounts(); await push(); await pull(); state.error = null; }
    catch (e) { state.error = e.message || String(e); }
    finally { state.syncing = false; emit(); }
  }
  function enqueue(table, row) { queue.push({ table, row }); save(); emit(); sync(); }

  // ---------- session ----------
  function saveSession() {
    if (!session) { write(K.session, null); write(K.session, null, SS); return; }
    if (session.stay) write(K.session, session); else write(K.session, session, SS);
  }
  function endSession() { session = null; saveSession(); quizResults = []; save(); emit(); }
  const me = () => session && session.account;
  const isManager = a => !!a && a.role !== 'employee';
  const assignable = role => role === 'developer' ? ['employee', 'boss', 'developer'] : role === 'boss' ? ['employee'] : [];

  window.TeamStore = {
    remote, state,
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    get user() { return (me() && me().name) || read(K.user, ''); },
    set user(v) { write(K.user, v); emit(); },
    get hasTeamCode() { return !!teamCode(); },
    setTeamCode(v) { write(K.team, v); write(K.since, null); state.lastSync = null; state.error = null; state.verified = false;
                     accounts = null; state.accountsLoaded = false; write(K.accounts, null); emit(); sync(); },
    pending() { return queue.length + quizQueue.length; },

    // accounts
    get account() { return me(); },
    get accounts() { return accounts || []; },
    isManager, assignable,
    canEdit(target) { const m = me(); if (!m || !target) return false; if (m.role === 'developer') return true;
                      return m.role === 'boss' && (target.id === m.id || target.role === 'employee'); },
    canDelete(target) { const m = me(); if (!m || !target || target.id === m.id) return false;
                        return m.role === 'developer' || (m.role === 'boss' && target.role === 'employee'); },
    async loadAccounts() { await verify(); await pullAccounts(); emit(); return accounts; },
    async createFirstDeveloper(name, workID, pin, photo) {
      const r = await rpc('create_first_developer', { p_name: name, p_work_id: workID, p_pin: pin, p_photo: photo || null });
      if (r.error) return r;
      session = { token: r.token, account: r.account, stay: true }; saveSession(); await this.loadAccounts(); sync(); return r;
    },
    async logIn(id, pin, stay) {
      const r = await rpc('log_in', { p_id: id, p_pin: pin });
      if (r.error) return r;
      session = { token: r.token, account: r.account, stay: !!stay }; saveSession(); emit(); sync(); return r;
    },
    async logOut() {
      const t = session && session.token; endSession();
      if (t && navigator.onLine) rpc('log_out', { p_token: t }).catch(() => {});
    },
    async saveAccount(id, name, workID, role, pin, photo) {
      const r = await rpc('save_account', { p_token: session.token, p_id: id || null, p_name: name, p_work_id: workID,
                                             p_role: role, p_pin: pin || null, p_photo: photo || null });
      if (r.error === 'login') endSession();
      if (!r.error) await pullAccounts();
      emit(); return r;
    },
    async deleteAccount(id) {
      const r = await rpc('delete_account', { p_token: session.token, p_id: id });
      if (r.error === 'login') endSession();
      if (!r.error) await pullAccounts();
      emit(); return r;
    },

    // notes
    notesFor(productID) {
      return Object.values(notes).filter(n => n.productID === productID && !n.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    allNotes() { return Object.values(notes).filter(n => !n.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    canDeleteNote(n) { const m = me(); return !!m && (isManager(m) || n.accountID === m.id); },
    addNote(productID, variantID, text) {
      const t = now(), m = me();
      const n = { id: uid(), productID, variantID: variantID || null, text, author: this.user || 'Onbekend', accountID: m ? m.id : null,
                  createdAt: t, updatedAt: t, deleted: false };
      notes[n.id] = n; save(); enqueue('notes', toRow.notes(n)); return n;
    },
    deleteNote(id) {
      const n = notes[id]; if (!n) return;
      n.deleted = true; n.updatedAt = now(); save(); enqueue('notes', toRow.notes(n));
    },

    // out-of-stock flags
    isOut(variantID) { return !!(flags[variantID] && flags[variantID].out); },
    flag(variantID) { return flags[variantID]; },
    outList() { return Object.values(flags).filter(f => f.out).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
    setOut(productID, variantID, out, comment) {
      const m = me();
      const f = { variantID, productID, out, author: this.user || 'Onbekend', accountID: m ? m.id : null, comment: out ? (comment || '') : '', updatedAt: now() };
      flags[variantID] = f; save(); enqueue('stock_flags', toRow.stock_flags(f));
    },

    // quiz
    quizResults() {
      const pending = quizQueue.map(q => Object.assign({ accountID: q.accountID, accountName: q.accountName }, q));
      return pending.concat(quizResults.filter(r => !quizQueue.some(q => q.id === r.id)));
    },
    addQuizResult(quizID, score, total) {
      const m = me(); if (!m) return;
      quizQueue.push({ id: uid(), quizID, score, total, date: now(), accountID: m.id, accountName: m.name });
      save(); emit(); sync();
    },
    sync
  };
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 60000);
  sync();
})();
