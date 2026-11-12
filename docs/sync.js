/* Local-first store for notes and out-of-stock flags, with optional sync to Supabase.
   Everything is saved on the device first, so it works offline; changes are sent when online. */
(function () {
  const K = { notes: 'oh.notes', flags: 'oh.flags', queue: 'oh.queue', since: 'oh.since', user: 'oh.user', team: 'oh.team' };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const cfg = window.OLDENHOF_CONFIG || {};
  const remote = !!(cfg.supabaseURL && cfg.supabaseKey);
  const listeners = new Set();
  let notes = read(K.notes, {});      // id -> note
  let flags = read(K.flags, {});      // variantID -> flag
  let queue = read(K.queue, []);      // [{table,row}]
  let state = { syncing: false, lastSync: read(K.since, null), error: null };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const now = () => new Date().toISOString();
  const save = () => { write(K.notes, notes); write(K.flags, flags); write(K.queue, queue); };
  const emit = () => listeners.forEach(f => f());

  const toRow = {
    notes: n => ({ id: n.id, product_id: n.productID, variant_id: n.variantID, text: n.text, author: n.author,
                   created_at: n.createdAt, updated_at: n.updatedAt, deleted: !!n.deleted }),
    stock_flags: f => ({ variant_id: f.variantID, product_id: f.productID, out_of_stock: f.out, author: f.author, updated_at: f.updatedAt })
  };
  const fromRow = {
    notes: r => ({ id: r.id, productID: r.product_id, variantID: r.variant_id, text: r.text, author: r.author,
                   createdAt: r.created_at, updatedAt: r.updated_at, deleted: r.deleted }),
    stock_flags: r => ({ variantID: r.variant_id, productID: r.product_id, out: r.out_of_stock, author: r.author, updatedAt: r.updated_at })
  };

  const teamCode = () => cfg.teamCode || read(K.team, '');
  function headers(extra) {
    return Object.assign({ apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey,
      'Content-Type': 'application/json', 'x-team-code': teamCode() }, extra || {});
  }
  // Reads with a wrong code just return nothing, so ask the database once whether the code is right.
  // (check_team() exists after running the team-code SQL; without it this check is skipped.)
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
        const res = await fetch(`${cfg.supabaseURL}/rest/v1/${t}`, { method: 'POST',
          headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(byTable[t]) });
        if (!res.ok) throw new Error(`Opslaan mislukt (${res.status})`);
      }
      queue = queue.slice(batch.length); save();
    }
  }
  async function pull() {
    // Always fetch the full (small) tables: a note written offline keeps its original time,
    // so an "only newer than my last sync" filter could skip it.
    const since = '1970-01-01T00:00:00Z';
    const started = now();
    for (const t of ['notes', 'stock_flags']) {
      const res = await fetch(`${cfg.supabaseURL}/rest/v1/${t}?select=*&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=5000`, { headers: headers() });
      if (!res.ok) throw new Error(`Ophalen mislukt (${res.status})`);
      for (const r of await res.json()) {
        const x = fromRow[t](r);
        if (t === 'notes') { if (!notes[x.id] || notes[x.id].updatedAt <= x.updatedAt) notes[x.id] = x; }
        else if (!flags[x.variantID] || flags[x.variantID].updatedAt <= x.updatedAt) flags[x.variantID] = x;
      }
    }
    state.lastSync = started; write(K.since, started); save();
  }
  async function sync() {
    if (!remote || !teamCode() || state.syncing || !navigator.onLine) return;
    state.syncing = true; emit();
    try { await verify(); await push(); await pull(); state.error = null; }
    catch (e) { state.error = e.message || String(e); }
    finally { state.syncing = false; emit(); }
  }
  function enqueue(table, row) { queue.push({ table, row }); save(); emit(); sync(); }

  window.TeamStore = {
    remote, state,
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    get user() { return read(K.user, ''); },
    get hasTeamCode() { return !!teamCode(); },
    setTeamCode(v) { write(K.team, v); write(K.since, null); state.lastSync = null; state.error = null; state.verified = false; emit(); sync(); },
    set user(v) { write(K.user, v); emit(); },
    pending() { return queue.length; },
    notesFor(productID) {
      return Object.values(notes).filter(n => n.productID === productID && !n.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    allNotes() { return Object.values(notes).filter(n => !n.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    addNote(productID, variantID, text) {
      const t = now();
      const n = { id: uid(), productID, variantID: variantID || null, text, author: this.user || 'Onbekend', createdAt: t, updatedAt: t, deleted: false };
      notes[n.id] = n; save(); enqueue('notes', toRow.notes(n)); return n;
    },
    deleteNote(id) {
      const n = notes[id]; if (!n) return;
      n.deleted = true; n.updatedAt = now(); save(); enqueue('notes', toRow.notes(n));
    },
    isOut(variantID) { return !!(flags[variantID] && flags[variantID].out); },
    flag(variantID) { return flags[variantID]; },
    outList() { return Object.values(flags).filter(f => f.out).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
    setOut(productID, variantID, out) {
      const f = { variantID, productID, out, author: this.user || 'Onbekend', updatedAt: now() };
      flags[variantID] = f; save(); enqueue('stock_flags', toRow.stock_flags(f));
    },
    sync
  };
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 60000);
  sync();
})();
