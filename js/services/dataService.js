window.DataService = (() => {

  const BACKEND = 'googleSheets'; // 'localStorage' | 'googleSheets'

  const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxhvox370Cr6mrTJifsmKIhcftLaKhOtGx9x8MQ4cAvxPLB4rpHYUPmgavEqYU2l-xRww/exec';

  // ─── Seed Data ────────────────────────────────────────────────────────
  const SEED = {
    users: [ /* ... tu seed original ... */ ],
    areas: [ /* ... */ ],
    // etc.
  };

  // ─── Init ─────────────────────────────────────────────────────────────
  function init() {
    const keys = ['users','areas','subareas','machines','stopReasons','stopages','alertConfig','offlineQueue'];
    keys.forEach(k => {
      if (!localStorage.getItem('mc_' + k)) {
        localStorage.setItem('mc_' + k, JSON.stringify(SEED[k] || []));
      }
    });
  }

  // ─── Google Sheets request ────────────────────────────────────────────
  async function sheetsRequest(action, payload = {}) {
    const url = SHEETS_URL + '?action=' + action + '&data=' + encodeURIComponent(JSON.stringify(payload));
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.error('[SheetsService] Error:', err);
      return { error: err.message };
    }
  }

  // ─── localStorage helpers ─────────────────────────────────────────────
  function _lsGetAll(collection) {
    try { return JSON.parse(localStorage.getItem('mc_' + collection)) || []; }
    catch { return []; }
  }
  function _lsSave(collection, data) {
    localStorage.setItem('mc_' + collection, JSON.stringify(data));
  }

  // ─── Generic CRUD (ruteado según BACKEND) ─────────────────────────────
  async function getAll(collection) {
    if (BACKEND === 'googleSheets') {
      const result = await sheetsRequest('getAll', { sheet: collection });
      // Sincronizar localStorage como caché local
      if (Array.isArray(result)) _lsSave(collection, result);
      return Array.isArray(result) ? result : _lsGetAll(collection);
    }
    return _lsGetAll(collection);
  }

  function getById(collection, id) {
    // Para lectura puntual usamos el caché local (ya sincronizado por getAll)
    return _lsGetAll(collection).find(r => r.id === id) || null;
  }

  async function create(collection, data) {
    const record = {
      ...data,
      id: data.id || genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Siempre guardar en localStorage (caché / offline)
    const all = _lsGetAll(collection);
    all.push(record);
    _lsSave(collection, all);

    if (BACKEND === 'googleSheets') {
      if (navigator.onLine) {
        const result = await sheetsRequest('create', { sheet: collection, data: record });
        if (result.error) console.warn('[Sheets create error]', result.error);
      } else {
        _queueOffline(collection, 'create', record);
      }
    }

    return record;
  }

  async function update(collection, id, data) {
    const all = _lsGetAll(collection);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;

    all[idx] = { ...all[idx], ...data, id, updatedAt: new Date().toISOString() };
    _lsSave(collection, all);

    if (BACKEND === 'googleSheets') {
      if (navigator.onLine) {
        const result = await sheetsRequest('update', { sheet: collection, id, data: all[idx] });
        if (result.error) console.warn('[Sheets update error]', result.error);
      } else {
        _queueOffline(collection, 'update', all[idx]);
      }
    }

    return all[idx];
  }

  async function remove(collection, id) {
    const all = _lsGetAll(collection).filter(r => r.id !== id);
    _lsSave(collection, all);

    if (BACKEND === 'googleSheets') {
      if (navigator.onLine) {
        const result = await sheetsRequest('delete', { sheet: collection, id });
        if (result.error) console.warn('[Sheets delete error]', result.error);
      } else {
        _queueOffline(collection, 'delete', { id });
      }
    }

    return true;
  }

  // ─── Offline queue ────────────────────────────────────────────────────
  function _queueOffline(collection, action, data) {
    const queue = _lsGetAll('offlineQueue');
    queue.push({ collection, action, data, timestamp: new Date().toISOString() });
    _lsSave('offlineQueue', queue);
  }

  async function flushOfflineQueue() {
    const queue = _lsGetAll('offlineQueue');
    if (!queue.length || !navigator.onLine) return 0;
    console.log('[DataService] Flushing offline queue:', queue.length, 'items');
    for (const item of queue) {
      await sheetsRequest(item.action, { sheet: item.collection, data: item.data, id: item.data?.id });
    }
    _lsSave('offlineQueue', []);
    return queue.length;
  }

  // ─── Domain queries (usan caché local para ser síncronas) ──────────────
  function getStopages(filters = {}) {
    let data = _lsGetAll('stopages');
    if (filters.areaId)        data = data.filter(s => s.areaId === filters.areaId);
    if (filters.subareaId)     data = data.filter(s => s.subareaId === filters.subareaId);
    if (filters.machineId)     data = data.filter(s => s.machineId === filters.machineId);
    if (filters.status)        data = data.filter(s => s.status === filters.status);
    if (filters.responsibleId) data = data.filter(s => s.responsibleId === filters.responsibleId);
    if (filters.reasonId)      data = data.filter(s => s.reasonId === filters.reasonId);
    if (filters.dateFrom)      data = data.filter(s => s.startAt >= filters.dateFrom);
    if (filters.dateTo)        data = data.filter(s => s.startAt <= filters.dateTo + 'T23:59');
    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getDashboardStats(filters = {}) {
    const stopages = getStopages(filters);
    const machines = _lsGetAll('machines');
    const areas    = _lsGetAll('areas');

    const byArea = {};
    areas.forEach(a => { byArea[a.id] = { name: a.name, count: 0, duration: 0 }; });
    stopages.forEach(s => {
      if (byArea[s.areaId]) { byArea[s.areaId].count++; byArea[s.areaId].duration += (s.duration || 0); }
    });

    const byStatus = { pendiente: 0, en_proceso: 0, finalizado: 0 };
    stopages.forEach(s => { if (byStatus[s.status] !== undefined) byStatus[s.status]++; });

    const byMachine = {};
    machines.forEach(m => { byMachine[m.id] = { name: m.name, count: 0, duration: 0 }; });
    stopages.forEach(s => {
      if (byMachine[s.machineId]) { byMachine[s.machineId].count++; byMachine[s.machineId].duration += (s.duration || 0); }
    });

    const completed = stopages.filter(s => s.duration);
    const avgDuration   = completed.length ? Math.round(completed.reduce((a,s) => a + s.duration, 0) / completed.length) : 0;
    const totalDuration = stopages.reduce((a,s) => a + (s.duration || 0), 0);

    const timeSeries = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStops = stopages.filter(s => s.startAt.startsWith(dateStr));
      timeSeries.push({ date: dateStr, count: dayStops.length, duration: dayStops.reduce((a,s) => a + (s.duration||0), 0) });
    }

    return { total: stopages.length, byStatus, byArea, byMachine, avgDuration, totalDuration, timeSeries, recent: stopages.slice(0,5) };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  function calcDuration(startAt, endAt) {
    if (!startAt || !endAt) return null;
    return Math.round((new Date(endAt) - new Date(startAt)) / 60000);
  }

  return { init, getAll, getById, create, update, remove, getStopages, getDashboardStats, calcDuration, flushOfflineQueue, genId };
})();
