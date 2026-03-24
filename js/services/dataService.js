/**
 * MaintControl - Data Service Layer
 * Abstraction layer for backend-agnostic data access.
 * Currently uses localStorage + Google Sheets.
 * To migrate to MySQL/PostgreSQL/Firestore: only update this file.
 * 
 * Architecture pattern: Repository + Adapter
 */

window.DataService = (() => {
  // ─── Backend adapter (swap to switch backends) ───────────────────────
  const BACKEND = 'localStorage'; // 'localStorage' | 'googleSheets' | 'rest' | 'firestore'
  
  // ─── Seed Data ───────────────────────────────────────────────────────
  const SEED = {
    users: [
      { id:'u1', name:'Super Admin', email:'superadmin@plant.com', password:'admin123', role:'superadmin', areas:[], active:true, createdAt:'2024-01-01' },
      { id:'u2', name:'Carlos Méndez', email:'admin@plant.com', password:'admin123', role:'admin', areas:['a1','a2'], active:true, createdAt:'2024-01-01' },
      { id:'u3', name:'Ana García', email:'supervisor@plant.com', password:'admin123', role:'supervisor', areas:['a1'], active:true, createdAt:'2024-01-01' },
      { id:'u4', name:'Pedro López', email:'tecnico@plant.com', password:'admin123', role:'tecnico', areas:['a1'], active:true, createdAt:'2024-01-01' },
      { id:'u5', name:'María Torres', email:'jefe@plant.com', password:'admin123', role:'jefe', areas:['a1','a2'], active:true, createdAt:'2024-01-01' },
    ],
    areas: [
      { id:'a1', name:'Producción', code:'PROD', description:'Líneas de producción principal', active:true },
      { id:'a2', name:'Empaque', code:'EMP', description:'Área de empaque y sellado', active:true },
      { id:'a3', name:'Utilities', code:'UTL', description:'Servicios generales y utilities', active:true },
    ],
    subareas: [
      { id:'sa1', areaId:'a1', name:'Línea 1', code:'L1', active:true },
      { id:'sa2', areaId:'a1', name:'Línea 2', code:'L2', active:true },
      { id:'sa3', areaId:'a2', name:'Empaque A', code:'EA', active:true },
      { id:'sa4', areaId:'a2', name:'Empaque B', code:'EB', active:true },
      { id:'sa5', areaId:'a3', name:'Compresor', code:'COMP', active:true },
    ],
    machines: [
      { id:'m1', subareaId:'sa1', name:'Llenadora L1-01', code:'LL-01', type:'Llenadora', active:true },
      { id:'m2', subareaId:'sa1', name:'Tapadora L1-02', code:'TP-02', type:'Tapadora', active:true },
      { id:'m3', subareaId:'sa2', name:'Llenadora L2-01', code:'LL-03', type:'Llenadora', active:true },
      { id:'m4', subareaId:'sa3', name:'Termoencogible EA-01', code:'TE-01', type:'Termoencogible', active:true },
      { id:'m5', subareaId:'sa3', name:'Selladora EA-02', code:'SE-01', type:'Selladora', active:true },
      { id:'m6', subareaId:'sa5', name:'Compresor 1', code:'CP-01', type:'Compresor', active:true },
    ],
    stopReasons: [
      { id:'r1', name:'Falla mecánica', category:'Mecánica', active:true },
      { id:'r2', name:'Falla eléctrica', category:'Eléctrica', active:true },
      { id:'r3', name:'Mantenimiento preventivo', category:'Preventivo', active:true },
      { id:'r4', name:'Cambio de formato', category:'Operativa', active:true },
      { id:'r5', name:'Falta de material', category:'Logística', active:true },
      { id:'r6', name:'Limpieza', category:'Operativa', active:true },
      { id:'r7', name:'Ajuste de proceso', category:'Proceso', active:true },
      { id:'r8', name:'Otro', category:'Otros', active:true },
    ],
    stopages: [
      {
        id:'st1', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1',
        reasonFree:'Rotura de eje principal', responsibleId:'u4',
        status:'finalizado', startAt:'2024-06-10T08:00', endAt:'2024-06-10T10:30',
        duration:150, notes:'Se reemplazó eje y rodamiento', createdAt:'2024-06-10T08:00', updatedAt:'2024-06-10T10:30'
      },
      {
        id:'st2', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r2',
        reasonFree:'Cortocircuito en tablero', responsibleId:'u4',
        status:'finalizado', startAt:'2024-06-11T14:00', endAt:'2024-06-11T16:00',
        duration:120, notes:'', createdAt:'2024-06-11T14:00', updatedAt:'2024-06-11T16:00'
      },
      {
        id:'st3', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r3',
        reasonFree:'', responsibleId:'u4',
        status:'finalizado', startAt:'2024-06-12T06:00', endAt:'2024-06-12T08:00',
        duration:120, notes:'Mantenimiento mensual programado', createdAt:'2024-06-12T06:00', updatedAt:'2024-06-12T08:00'
      },
      {
        id:'st4', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1',
        reasonFree:'Vibración excesiva', responsibleId:'u4',
        status:'en_proceso', startAt:'2024-06-13T09:00', endAt:null,
        duration:null, notes:'', createdAt:'2024-06-13T09:00', updatedAt:'2024-06-13T09:00'
      },
      {
        id:'st5', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r4',
        reasonFree:'Cambio a línea 500ml', responsibleId:'u4',
        status:'pendiente', startAt:'2024-06-13T11:00', endAt:null,
        duration:null, notes:'', createdAt:'2024-06-13T11:00', updatedAt:'2024-06-13T11:00'
      },
    ],
    alertConfig: { prolongedStopMinutes: 60, notifyRoles: ['supervisor','jefe','gerente','admin','superadmin'] },
    offlineQueue: [],
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

  // ─── Generic CRUD ─────────────────────────────────────────────────────
  function getAll(collection) {
    try {
      return JSON.parse(localStorage.getItem('mc_' + collection)) || [];
    } catch { return []; }
  }

  function getById(collection, id) {
    return getAll(collection).find(r => r.id === id) || null;
  }

  function create(collection, data) {
    const all = getAll(collection);
    const record = { ...data, id: data.id || genId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    all.push(record);
    save(collection, all);
    queueIfOffline(collection, 'create', record);
    return record;
  }

  function update(collection, id, data) {
    const all = getAll(collection);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data, id, updatedAt: new Date().toISOString() };
    save(collection, all);
    queueIfOffline(collection, 'update', all[idx]);
    return all[idx];
  }

  function remove(collection, id) {
    const all = getAll(collection).filter(r => r.id !== id);
    save(collection, all);
    queueIfOffline(collection, 'delete', { id });
    return true;
  }

  function save(collection, data) {
    localStorage.setItem('mc_' + collection, JSON.stringify(data));
  }

  // ─── Offline queue ────────────────────────────────────────────────────
  function queueIfOffline(collection, action, data) {
    if (!navigator.onLine) {
      const queue = getAll('offlineQueue');
      queue.push({ collection, action, data, timestamp: new Date().toISOString() });
      save('offlineQueue', queue);
    }
  }

  async function flushOfflineQueue() {
    const queue = getAll('offlineQueue');
    if (!queue.length || !navigator.onLine) return;
    console.log('[DataService] Flushing offline queue:', queue.length, 'items');
    // In production, send each item to Google Sheets or backend here
    save('offlineQueue', []);
    return queue.length;
  }

  // ─── Domain-specific queries ──────────────────────────────────────────
  function getStopages(filters = {}) {
    let data = getAll('stopages');
    if (filters.areaId) data = data.filter(s => s.areaId === filters.areaId);
    if (filters.subareaId) data = data.filter(s => s.subareaId === filters.subareaId);
    if (filters.machineId) data = data.filter(s => s.machineId === filters.machineId);
    if (filters.status) data = data.filter(s => s.status === filters.status);
    if (filters.responsibleId) data = data.filter(s => s.responsibleId === filters.responsibleId);
    if (filters.reasonId) data = data.filter(s => s.reasonId === filters.reasonId);
    if (filters.dateFrom) data = data.filter(s => s.startAt >= filters.dateFrom);
    if (filters.dateTo) data = data.filter(s => s.startAt <= filters.dateTo + 'T23:59');
    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getDashboardStats(filters = {}) {
    const stopages = getStopages(filters);
    const machines = getAll('machines');
    const areas = getAll('areas');

    const byArea = {};
    areas.forEach(a => { byArea[a.id] = { name: a.name, count: 0, duration: 0 }; });
    stopages.forEach(s => {
      if (byArea[s.areaId]) {
        byArea[s.areaId].count++;
        byArea[s.areaId].duration += (s.duration || 0);
      }
    });

    const byStatus = { pendiente: 0, en_proceso: 0, finalizado: 0 };
    stopages.forEach(s => { if (byStatus[s.status] !== undefined) byStatus[s.status]++; });

    const byMachine = {};
    machines.forEach(m => { byMachine[m.id] = { name: m.name, count: 0, duration: 0 }; });
    stopages.forEach(s => {
      if (byMachine[s.machineId]) {
        byMachine[s.machineId].count++;
        byMachine[s.machineId].duration += (s.duration || 0);
      }
    });

    const completed = stopages.filter(s => s.duration);
    const avgDuration = completed.length ? Math.round(completed.reduce((a,s) => a + s.duration, 0) / completed.length) : 0;
    const totalDuration = stopages.reduce((a,s) => a + (s.duration || 0), 0);

    // Time series (last 7 days)
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
  }

  function calcDuration(startAt, endAt) {
    if (!startAt || !endAt) return null;
    return Math.round((new Date(endAt) - new Date(startAt)) / 60000);
  }

  return { init, getAll, getById, create, update, remove, getStopages, getDashboardStats, calcDuration, flushOfflineQueue, genId };
})();

/**
 * Google Sheets Service (Adapter)
 * Replace DataService calls with these when connecting to Google Sheets.
 * Set your Apps Script URL in config.
 */
window.SheetsService = (() => {
  const CONFIG = {
    scriptUrl: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
    // Get this from: Extensions > Apps Script > Deploy > Web App
  };

  async function request(action, payload = {}) {
    const url = CONFIG.scriptUrl + '?action=' + action + '&data=' + encodeURIComponent(JSON.stringify(payload));
    const res = await fetch(url);
    return res.json();
  }

  return {
    getAll: (sheet) => request('getAll', { sheet }),
    create: (sheet, data) => request('create', { sheet, data }),
    update: (sheet, id, data) => request('update', { sheet, id, data }),
    remove: (sheet, id) => request('delete', { sheet, id }),
  };
})();
