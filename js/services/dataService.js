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
  const BACKEND = 'googleSheets'; // 'localStorage' | 'googleSheets' | 'rest' | 'firestore'
  
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
      // ── Week -4 ──────────────────────────────────────────────
      { id:'st01', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1', reasonFree:'Rotura de eje principal', responsibleId:'u4', status:'finalizado', startAt:'2026-02-24T08:00', endAt:'2026-02-24T10:30', duration:150, notes:'Se reemplazó eje y rodamiento', createdAt:'2026-02-24T08:00', updatedAt:'2026-02-24T10:30' },
      { id:'st02', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r2', reasonFree:'Cortocircuito en tablero', responsibleId:'u4', status:'finalizado', startAt:'2026-02-24T14:00', endAt:'2026-02-24T16:00', duration:120, notes:'', createdAt:'2026-02-24T14:00', updatedAt:'2026-02-24T16:00' },
      { id:'st03', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r3', reasonFree:'', responsibleId:'u4', status:'finalizado', startAt:'2026-02-25T06:00', endAt:'2026-02-25T08:00', duration:120, notes:'Mantenimiento mensual programado', createdAt:'2026-02-25T06:00', updatedAt:'2026-02-25T08:00' },
      { id:'st04', machineId:'m2', subareaId:'sa1', areaId:'a1', reasonId:'r6', reasonFree:'Limpieza profunda semanal', responsibleId:'u4', status:'finalizado', startAt:'2026-02-25T12:00', endAt:'2026-02-25T13:00', duration:60, notes:'', createdAt:'2026-02-25T12:00', updatedAt:'2026-02-25T13:00' },
      { id:'st05', machineId:'m6', subareaId:'sa5', areaId:'a3', reasonId:'r1', reasonFree:'Desgaste de compresor', responsibleId:'u4', status:'finalizado', startAt:'2026-02-26T07:00', endAt:'2026-02-26T11:00', duration:240, notes:'Cambio de filtros y aceite', createdAt:'2026-02-26T07:00', updatedAt:'2026-02-26T11:00' },
      { id:'st06', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r2', reasonFree:'Falla en motor principal', responsibleId:'u4', status:'finalizado', startAt:'2026-02-27T09:30', endAt:'2026-02-27T12:30', duration:180, notes:'Reemplazo de motor', createdAt:'2026-02-27T09:30', updatedAt:'2026-02-27T12:30' },
      { id:'st07', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r5', reasonFree:'Falta de botellas vacías', responsibleId:'u4', status:'finalizado', startAt:'2026-02-27T14:00', endAt:'2026-02-27T15:30', duration:90, notes:'', createdAt:'2026-02-27T14:00', updatedAt:'2026-02-27T15:30' },
      // ── Week -3 ──────────────────────────────────────────────
      { id:'st08', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r4', reasonFree:'Cambio de producto 250ml→500ml', responsibleId:'u4', status:'finalizado', startAt:'2026-03-02T06:00', endAt:'2026-03-02T07:30', duration:90, notes:'', createdAt:'2026-03-02T06:00', updatedAt:'2026-03-02T07:30' },
      { id:'st09', machineId:'m2', subareaId:'sa1', areaId:'a1', reasonId:'r7', reasonFree:'Desajuste en torque de tapas', responsibleId:'u4', status:'finalizado', startAt:'2026-03-03T10:00', endAt:'2026-03-03T11:00', duration:60, notes:'Ajuste realizado por técnico senior', createdAt:'2026-03-03T10:00', updatedAt:'2026-03-03T11:00' },
      { id:'st10', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r1', reasonFree:'Falla en sensor de temperatura', responsibleId:'u4', status:'finalizado', startAt:'2026-03-04T08:00', endAt:'2026-03-04T11:00', duration:180, notes:'Sensor reemplazado', createdAt:'2026-03-04T08:00', updatedAt:'2026-03-04T11:00' },
      { id:'st11', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r3', reasonFree:'', responsibleId:'u4', status:'finalizado', startAt:'2026-03-05T06:00', endAt:'2026-03-05T09:00', duration:180, notes:'Mantto preventivo mensual', createdAt:'2026-03-05T06:00', updatedAt:'2026-03-05T09:00' },
      { id:'st12', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r6', reasonFree:'', responsibleId:'u4', status:'finalizado', startAt:'2026-03-06T13:00', endAt:'2026-03-06T14:00', duration:60, notes:'', createdAt:'2026-03-06T13:00', updatedAt:'2026-03-06T14:00' },
      { id:'st13', machineId:'m6', subareaId:'sa5', areaId:'a3', reasonId:'r2', reasonFree:'Falla eléctrica en panel', responsibleId:'u4', status:'finalizado', startAt:'2026-03-07T15:00', endAt:'2026-03-07T17:30', duration:150, notes:'', createdAt:'2026-03-07T15:00', updatedAt:'2026-03-07T17:30' },
      // ── Week -2 ──────────────────────────────────────────────
      { id:'st14', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r1', reasonFree:'Rotura de banda transportadora', responsibleId:'u4', status:'finalizado', startAt:'2026-03-09T07:00', endAt:'2026-03-09T10:00', duration:180, notes:'Banda reemplazada stock', createdAt:'2026-03-09T07:00', updatedAt:'2026-03-09T10:00' },
      { id:'st15', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r5', reasonFree:'Falta de etiquetas', responsibleId:'u4', status:'finalizado', startAt:'2026-03-10T11:00', endAt:'2026-03-10T12:30', duration:90, notes:'', createdAt:'2026-03-10T11:00', updatedAt:'2026-03-10T12:30' },
      { id:'st16', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r7', reasonFree:'Temperatura de sellado fuera de rango', responsibleId:'u4', status:'finalizado', startAt:'2026-03-11T09:00', endAt:'2026-03-11T10:30', duration:90, notes:'', createdAt:'2026-03-11T09:00', updatedAt:'2026-03-11T10:30' },
      { id:'st17', machineId:'m2', subareaId:'sa1', areaId:'a1', reasonId:'r2', reasonFree:'Quemado de bobina', responsibleId:'u4', status:'finalizado', startAt:'2026-03-12T14:00', endAt:'2026-03-12T17:00', duration:180, notes:'Bobina en reparación externa', createdAt:'2026-03-12T14:00', updatedAt:'2026-03-12T17:00' },
      { id:'st18', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r4', reasonFree:'Cambio formato bolsa', responsibleId:'u4', status:'finalizado', startAt:'2026-03-13T06:30', endAt:'2026-03-13T08:00', duration:90, notes:'', createdAt:'2026-03-13T06:30', updatedAt:'2026-03-13T08:00' },
      // ── Last week ────────────────────────────────────────────
      { id:'st19', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1', reasonFree:'Vibración anormal en rodamiento', responsibleId:'u4', status:'finalizado', startAt:'2026-03-16T08:00', endAt:'2026-03-16T10:00', duration:120, notes:'', createdAt:'2026-03-16T08:00', updatedAt:'2026-03-16T10:00' },
      { id:'st20', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r3', reasonFree:'', responsibleId:'u4', status:'finalizado', startAt:'2026-03-17T06:00', endAt:'2026-03-17T08:30', duration:150, notes:'Preventivo trimestral', createdAt:'2026-03-17T06:00', updatedAt:'2026-03-17T08:30' },
      { id:'st21', machineId:'m6', subareaId:'sa5', areaId:'a3', reasonId:'r1', reasonFree:'Fuga de aire en línea', responsibleId:'u4', status:'finalizado', startAt:'2026-03-18T13:00', endAt:'2026-03-18T15:00', duration:120, notes:'', createdAt:'2026-03-18T13:00', updatedAt:'2026-03-18T15:00' },
      { id:'st22', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r6', reasonFree:'', responsibleId:'u4', status:'finalizado', startAt:'2026-03-19T12:00', endAt:'2026-03-19T13:00', duration:60, notes:'', createdAt:'2026-03-19T12:00', updatedAt:'2026-03-19T13:00' },
      { id:'st23', machineId:'m2', subareaId:'sa1', areaId:'a1', reasonId:'r7', reasonFree:'Ajuste de presión en inyección', responsibleId:'u4', status:'finalizado', startAt:'2026-03-20T09:00', endAt:'2026-03-20T09:45', duration:45, notes:'', createdAt:'2026-03-20T09:00', updatedAt:'2026-03-20T09:45' },
      { id:'st24', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r2', reasonFree:'Falla sensor fotoeléctrico', responsibleId:'u4', status:'finalizado', startAt:'2026-03-21T14:00', endAt:'2026-03-21T15:30', duration:90, notes:'', createdAt:'2026-03-21T14:00', updatedAt:'2026-03-21T15:30' },
      // ── This week (active/recent) ────────────────────────────
      { id:'st25', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1', reasonFree:'Desgaste de cadena de arrastre', responsibleId:'u4', status:'finalizado', startAt:'2026-03-23T07:00', endAt:'2026-03-23T09:30', duration:150, notes:'Cadena reemplazada', createdAt:'2026-03-23T07:00', updatedAt:'2026-03-23T09:30' },
      { id:'st26', machineId:'m3', subareaId:'sa2', areaId:'a1', reasonId:'r5', reasonFree:'Falta de envases PET', responsibleId:'u4', status:'finalizado', startAt:'2026-03-23T10:00', endAt:'2026-03-23T11:00', duration:60, notes:'', createdAt:'2026-03-23T10:00', updatedAt:'2026-03-23T11:00' },
      { id:'st27', machineId:'m4', subareaId:'sa3', areaId:'a2', reasonId:'r1', reasonFree:'Vibración excesiva en cabezal', responsibleId:'u4', status:'finalizado', startAt:'2026-03-24T06:00', endAt:'2026-03-24T08:00', duration:120, notes:'', createdAt:'2026-03-24T06:00', updatedAt:'2026-03-24T08:00' },
      // ── ACTIVE (today) ───────────────────────────────────────
      { id:'st28', machineId:'m1', subareaId:'sa1', areaId:'a1', reasonId:'r1', reasonFree:'Vibración excesiva en motor', responsibleId:'u4', status:'en_proceso', startAt:'2026-03-24T09:00', endAt:null, duration:null, notes:'Técnico en sitio', createdAt:'2026-03-24T09:00', updatedAt:'2026-03-24T09:00' },
      { id:'st29', machineId:'m5', subareaId:'sa3', areaId:'a2', reasonId:'r4', reasonFree:'Cambio a línea 500ml', responsibleId:'u4', status:'pendiente', startAt:'2026-03-24T11:00', endAt:null, duration:null, notes:'', createdAt:'2026-03-24T11:00', updatedAt:'2026-03-24T11:00' },
      { id:'st30', machineId:'m6', subareaId:'sa5', areaId:'a3', reasonId:'r3', reasonFree:'Preventivo trimestral', responsibleId:'u4', status:'en_proceso', startAt:'2026-03-24T07:00', endAt:null, duration:null, notes:'En progreso', createdAt:'2026-03-24T07:00', updatedAt:'2026-03-24T07:00' },
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
    // ensure alertConfig has at least one entry
    if (!getAll('alertConfig').length) {
      save('alertConfig', [{ id:'cfg1', prolongedStopMinutes:60 }]);
    }
  }

  function resetDemo() {
    const keys = ['users','areas','subareas','machines','stopReasons','stopages','alertConfig','offlineQueue'];
    keys.forEach(k => localStorage.setItem('mc_' + k, JSON.stringify(SEED[k] || [])));
    if (!getAll('alertConfig').length) save('alertConfig', [{ id:'cfg1', prolongedStopMinutes:60 }]);
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

    // Time series (last 14 days)
    const timeSeries = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStops = stopages.filter(s => s.startAt && s.startAt.startsWith(dateStr));
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

  return { init, resetDemo, getAll, getById, create, update, remove, getStopages, getDashboardStats, calcDuration, flushOfflineQueue, genId };
})();

/**
 * Google Sheets Service (Adapter)
 * Replace DataService calls with these when connecting to Google Sheets.
 * Set your Apps Script URL in config.
 */
window.SheetsService = (() => {
  const CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbxhvox370Cr6mrTJifsmKIhcftLaKhOtGx9x8MQ4cAvxPLB4rpHYUPmgavEqYU2l-xRww/exec',
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
