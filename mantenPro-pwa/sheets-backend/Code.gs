/**
 * MantenPro - Backend en Google Apps Script
 * ==========================================
 * Este archivo reemplaza todo el backend de FastAPI + PostgreSQL.
 * Se despliega como Web App en Google Apps Script y usa Google Sheets
 * como base de datos.
 *
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Ve a https://script.google.com
 * 2. Crea un nuevo proyecto → pega este código
 * 3. Ejecuta la función "inicializarSistema()" una vez
 * 4. Despliega: Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo mismo
 *    - Acceso: Cualquier persona
 * 5. Copia la URL del despliegue y pégala en src/services/api.js
 */

// ─── Configuración ────────────────────────────────────────────────────────────
const CONFIG = {
  SPREADSHEET_ID: '', // Se llena automáticamente al inicializar
  SECRET_KEY: 'mantenpro-secret-2025', // Cambia esto
  TOKEN_EXPIRY_HOURS: 8,
  PROLONGED_MINUTES: 60,
};

// ─── Nombres de hojas ─────────────────────────────────────────────────────────
const SHEETS = {
  USERS: 'Usuarios',
  AREAS: 'Areas',
  SUBAREAS: 'Subareas',
  MACHINES: 'Maquinas',
  STOPPAGES: 'Paradas',
  REASONS: 'Motivos',
  CONFIG: 'Config',
};

// ─── Entry points HTTP ────────────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const path = e.parameter.path || '';
    const action = e.parameter.action || '';
    const token = e.parameter.token || (e.postData ? JSON.parse(e.postData.contents || '{}').token : '');

    // Rutas públicas (sin auth)
    if (path === 'login') {
      const body = JSON.parse(e.postData.contents);
      return jsonResponse(login(body.username, body.password));
    }

    if (path === 'health') {
      return jsonResponse({ status: 'ok', version: '1.0.0' });
    }

    // Verificar autenticación
    const user = verifyToken(token);
    if (!user) return jsonResponse({ error: 'No autorizado' }, 401);

    // Router
    const routes = {
      'areas':        () => handleAreas(action, e, user),
      'subareas':     () => handleSubareas(action, e, user),
      'machines':     () => handleMachines(action, e, user),
      'stoppages':    () => handleStoppages(action, e, user),
      'dashboard':    () => handleDashboard(action, e, user),
      'users':        () => handleUsers(action, e, user),
      'reasons':      () => handleReasons(action, e, user),
      'notifications':() => ({ items: [] }),
    };

    const handler = routes[path];
    if (!handler) return jsonResponse({ error: 'Ruta no encontrada' }, 404);

    return jsonResponse(handler());
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack }, 500);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function login(username, password) {
  const users = getSheet(SHEETS.USERS);
  const data = sheetToObjects(users);
  const user = data.find(u =>
    (u.username === username || u.email === username) &&
    u.password === password &&
    u.activo === 'true'
  );
  if (!user) throw new Error('Usuario o contraseña incorrectos');

  const token = generateToken(user);
  // Update last login
  updateRowById(SHEETS.USERS, user.id, { ultimo_acceso: new Date().toISOString() });

  return {
    access_token: token,
    token_type: 'bearer',
    user: sanitizeUser(user)
  };
}

function generateToken(user) {
  const payload = {
    sub: user.id,
    role: user.rol,
    area_id: user.area_id,
    exp: Date.now() + (CONFIG.TOKEN_EXPIRY_HOURS * 3600 * 1000)
  };
  return Utilities.base64Encode(JSON.stringify(payload));
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString());
    if (payload.exp < Date.now()) return null;
    const users = getSheet(SHEETS.USERS);
    const data = sheetToObjects(users);
    return data.find(u => u.id === payload.sub && u.activo === 'true') || null;
  } catch (e) {
    return null;
  }
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return {
    id: safe.id,
    username: safe.username,
    email: safe.email,
    full_name: safe.nombre_completo,
    role: safe.rol,
    area_id: safe.area_id || null,
    avatar_color: safe.color || '#6366F1',
    is_active: safe.activo === 'true',
  };
}

// ─── Areas ────────────────────────────────────────────────────────────────────

function handleAreas(action, e, user) {
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const id = e.parameter.id;

  if (action === 'list') {
    const areas = sheetToObjects(getSheet(SHEETS.AREAS)).filter(a => a.activo === 'true');
    const subareas = sheetToObjects(getSheet(SHEETS.SUBAREAS)).filter(s => s.activo === 'true');
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES)).filter(m => m.activo === 'true');

    // Filter by role
    let filteredAreas = areas;
    if (['operador','supervisor','jefe'].includes(user.rol) && user.area_id) {
      filteredAreas = areas.filter(a => a.id === user.area_id);
    }

    return filteredAreas.map(area => ({
      id: area.id, name: area.nombre, description: area.descripcion,
      color: area.color, is_active: true,
      created_at: area.creado_en,
      subareas: subareas
        .filter(s => s.area_id === area.id)
        .map(s => ({
          id: s.id, name: s.nombre, area_id: s.area_id, is_active: true,
          machines_count: machines.filter(m => m.subarea_id === s.id).length
        }))
    }));
  }

  if (action === 'create') {
    requireRole(user, ['super_administrador']);
    const newArea = {
      id: generateId(),
      nombre: body.name,
      descripcion: body.description || '',
      color: body.color || '#3B82F6',
      activo: 'true',
      creado_en: new Date().toISOString(),
      creado_por: user.id
    };
    appendRow(SHEETS.AREAS, newArea);
    return { id: newArea.id, name: newArea.nombre, color: newArea.color, is_active: true, subareas: [], created_at: newArea.creado_en };
  }

  if (action === 'update') {
    requireRole(user, ['super_administrador']);
    updateRowById(SHEETS.AREAS, id, {
      nombre: body.name, descripcion: body.description, color: body.color
    });
    return { ok: true };
  }

  if (action === 'delete') {
    requireRole(user, ['super_administrador']);
    updateRowById(SHEETS.AREAS, id, { activo: 'false' });
    return { ok: true };
  }

  return { error: 'Acción no válida' };
}

// ─── SubAreas ─────────────────────────────────────────────────────────────────

function handleSubareas(action, e, user) {
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const id = e.parameter.id;
  const areaId = e.parameter.area_id;

  if (action === 'list') {
    return sheetToObjects(getSheet(SHEETS.SUBAREAS))
      .filter(s => s.activo === 'true' && (!areaId || s.area_id === areaId))
      .map(s => ({ id: s.id, name: s.nombre, area_id: s.area_id, is_active: true }));
  }

  if (action === 'create') {
    requireRole(user, ['super_administrador']);
    const sub = {
      id: generateId(),
      nombre: body.name,
      descripcion: body.description || '',
      area_id: body.area_id,
      activo: 'true',
      creado_en: new Date().toISOString()
    };
    appendRow(SHEETS.SUBAREAS, sub);
    return { id: sub.id, name: sub.nombre, area_id: sub.area_id, is_active: true };
  }

  if (action === 'update') {
    requireRole(user, ['super_administrador']);
    updateRowById(SHEETS.SUBAREAS, id, { nombre: body.name, descripcion: body.description });
    return { ok: true };
  }

  if (action === 'delete') {
    requireRole(user, ['super_administrador']);
    updateRowById(SHEETS.SUBAREAS, id, { activo: 'false' });
    return { ok: true };
  }

  return [];
}

// ─── Machines ─────────────────────────────────────────────────────────────────

function handleMachines(action, e, user) {
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const id = e.parameter.id;
  const subareaId = e.parameter.subarea_id;

  if (action === 'list') {
    return sheetToObjects(getSheet(SHEETS.MACHINES))
      .filter(m => m.activo === 'true' && (!subareaId || m.subarea_id === subareaId))
      .map(m => ({ id: m.id, code: m.codigo, name: m.nombre, subarea_id: m.subarea_id, brand: m.marca, model: m.modelo, is_active: true }));
  }

  if (action === 'create') {
    requireRole(user, ['administrador', 'super_administrador']);
    const machine = {
      id: generateId(), codigo: body.code, nombre: body.name,
      subarea_id: body.subarea_id, marca: body.brand || '',
      modelo: body.model || '', serie: body.serial_number || '',
      activo: 'true', creado_en: new Date().toISOString()
    };
    appendRow(SHEETS.MACHINES, machine);
    return { id: machine.id, code: machine.codigo, name: machine.nombre, subarea_id: machine.subarea_id, is_active: true };
  }

  if (action === 'update') {
    requireRole(user, ['administrador', 'super_administrador']);
    updateRowById(SHEETS.MACHINES, id, { nombre: body.name, marca: body.brand, modelo: body.model });
    return { ok: true };
  }

  if (action === 'delete') {
    requireRole(user, ['administrador', 'super_administrador']);
    updateRowById(SHEETS.MACHINES, id, { activo: 'false' });
    return { ok: true };
  }

  return [];
}

// ─── Stoppages ────────────────────────────────────────────────────────────────

function handleStoppages(action, e, user) {
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const id = e.parameter.id;

  if (action === 'list') {
    let stoppages = sheetToObjects(getSheet(SHEETS.STOPPAGES));
    const areas = sheetToObjects(getSheet(SHEETS.AREAS));
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES));
    const users = sheetToObjects(getSheet(SHEETS.USERS));

    // Role filter
    if (user.rol === 'operador') {
      stoppages = stoppages.filter(s => s.reporter_id === user.id);
    } else if (['supervisor','jefe'].includes(user.rol)) {
      stoppages = stoppages.filter(s => s.area_id === user.area_id);
    }

    // Query filters
    if (e.parameter.status_filter) stoppages = stoppages.filter(s => s.estado === e.parameter.status_filter);
    if (e.parameter.area_id) stoppages = stoppages.filter(s => s.area_id === e.parameter.area_id);
    if (e.parameter.machine_id) stoppages = stoppages.filter(s => s.maquina_id === e.parameter.machine_id);

    // Pagination
    const page = parseInt(e.parameter.page || '1');
    const size = parseInt(e.parameter.size || '20');
    const total = stoppages.length;

    stoppages.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    const items = stoppages.slice((page - 1) * size, page * size).map(s => enrichStoppage(s, areas, machines, users));

    return { items, total, page, size, pages: Math.ceil(total / size) };
  }

  if (action === 'create') {
    // Operators only in their area
    if (user.rol === 'operador' && user.area_id && user.area_id !== body.area_id) {
      throw new Error('Solo puede registrar paradas en su área asignada');
    }
    const folio = generateFolio();
    const stoppage = {
      id: generateId(), folio,
      area_id: body.area_id, subarea_id: body.subarea_id, maquina_id: body.machine_id,
      inicio: body.start_time || new Date().toISOString(),
      fin: '', duracion_minutos: '',
      motivo_id: body.reason_id || '',
      motivo_custom: body.custom_reason || '',
      tipo: body.stoppage_type || 'otro',
      descripcion: body.description || '',
      notas_resolucion: '',
      estado: 'pendiente',
      reporter_id: user.id,
      alerta_prolongada: 'false',
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    };
    appendRow(SHEETS.STOPPAGES, stoppage);

    const areas = sheetToObjects(getSheet(SHEETS.AREAS));
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES));
    const users = sheetToObjects(getSheet(SHEETS.USERS));
    return enrichStoppage(stoppage, areas, machines, users);
  }

  if (action === 'get') {
    const stoppages = sheetToObjects(getSheet(SHEETS.STOPPAGES));
    const s = stoppages.find(s => s.id === id);
    if (!s) throw new Error('Parada no encontrada');
    const areas = sheetToObjects(getSheet(SHEETS.AREAS));
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES));
    const users = sheetToObjects(getSheet(SHEETS.USERS));
    return enrichStoppage(s, areas, machines, users);
  }

  if (action === 'update') {
    if (user.rol === 'operador') throw new Error('Sin permiso para actualizar paradas');
    const updates = { actualizado_en: new Date().toISOString() };
    if (body.status) updates.estado = body.status;
    if (body.end_time) {
      updates.fin = body.end_time;
      // Calculate duration
      const stoppages = sheetToObjects(getSheet(SHEETS.STOPPAGES));
      const s = stoppages.find(s => s.id === id);
      if (s && s.inicio) {
        const mins = (new Date(body.end_time) - new Date(s.inicio)) / 60000;
        updates.duracion_minutos = Math.round(mins * 100) / 100;
      }
    }
    if (body.resolution_notes) updates.notas_resolucion = body.resolution_notes;
    updateRowById(SHEETS.STOPPAGES, id, updates);
    return { ok: true };
  }

  if (action === 'delete') {
    requireRole(user, ['administrador', 'super_administrador']);
    deleteRowById(SHEETS.STOPPAGES, id);
    return { ok: true };
  }

  return { error: 'Acción no válida' };
}

function enrichStoppage(s, areas, machines, users) {
  const area = areas.find(a => a.id === s.area_id);
  const machine = machines.find(m => m.id === s.maquina_id);
  const reporter = users.find(u => u.id === s.reporter_id);
  return {
    id: s.id, folio: s.folio,
    area_id: s.area_id, subarea_id: s.subarea_id, machine_id: s.maquina_id,
    start_time: s.inicio, end_time: s.fin || null,
    duration_minutes: s.duracion_minutos ? parseFloat(s.duracion_minutos) : null,
    custom_reason: s.motivo_custom, stoppage_type: s.tipo,
    status: s.estado, description: s.descripcion,
    resolution_notes: s.notas_resolucion,
    reporter_id: s.reporter_id,
    is_prolonged_alert: s.alerta_prolongada === 'true',
    created_at: s.creado_en, updated_at: s.actualizado_en,
    area: area ? { id: area.id, name: area.nombre, color: area.color } : null,
    machine: machine ? { id: machine.id, code: machine.codigo, name: machine.nombre } : null,
    reporter: reporter ? { id: reporter.id, full_name: reporter.nombre_completo, username: reporter.username } : null,
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function handleDashboard(action, e, user) {
  const stoppages = sheetToObjects(getSheet(SHEETS.STOPPAGES));
  const areas = sheetToObjects(getSheet(SHEETS.AREAS)).filter(a => a.activo === 'true');

  let filtered = stoppages;
  if (['operador','supervisor','jefe'].includes(user.rol) && user.area_id) {
    filtered = stoppages.filter(s => s.area_id === user.area_id);
  }

  if (action === 'stats') {
    const today = new Date().toDateString();
    const durations = filtered.filter(s => s.duracion_minutos).map(s => parseFloat(s.duracion_minutos));
    return {
      total_stoppages: filtered.length,
      pending: filtered.filter(s => s.estado === 'pendiente').length,
      in_process: filtered.filter(s => s.estado === 'en_proceso').length,
      finished: filtered.filter(s => s.estado === 'finalizado').length,
      avg_duration_minutes: durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length*10)/10 : 0,
      total_downtime_hours: Math.round(durations.reduce((a,b)=>a+b,0)/60*10)/10,
      prolonged_alerts: filtered.filter(s => s.alerta_prolongada === 'true').length,
      stoppages_today: filtered.filter(s => new Date(s.inicio).toDateString() === today).length,
    };
  }

  if (action === 'by-area') {
    return areas.map(area => {
      const areaStops = filtered.filter(s => s.area_id === area.id);
      const durations = areaStops.filter(s => s.duracion_minutos).map(s => parseFloat(s.duracion_minutos));
      return {
        area_id: area.id, area_name: area.nombre, color: area.color,
        total: areaStops.length,
        pending: areaStops.filter(s => s.estado === 'pendiente').length,
        in_process: areaStops.filter(s => s.estado === 'en_proceso').length,
        finished: areaStops.filter(s => s.estado === 'finalizado').length,
        avg_duration: durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length*10)/10 : 0,
      };
    });
  }

  if (action === 'by-type') {
    const types = ['mecanica','electrica','operacional','calidad','otro'];
    const result = {};
    types.forEach(t => { result[t] = filtered.filter(s => s.tipo === t).length; });
    return result;
  }

  if (action === 'time-series') {
    const days = parseInt(e.parameter.days || '14');
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStops = filtered.filter(s => s.inicio && s.inicio.startsWith(dateStr));
      const mins = dayStops.filter(s => s.duracion_minutos).reduce((a,s) => a + parseFloat(s.duracion_minutos), 0);
      result.push({ date: dateStr, count: dayStops.length, total_minutes: Math.round(mins * 10) / 10 });
    }
    return result;
  }

  if (action === 'active') {
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES));
    const now = new Date();
    return filtered
      .filter(s => s.estado !== 'finalizado')
      .map(s => {
        const machine = machines.find(m => m.id === s.maquina_id);
        const area = areas.find(a => a.id === s.area_id);
        const elapsed = s.inicio ? Math.round((now - new Date(s.inicio)) / 60000) : 0;
        return {
          id: s.id, folio: s.folio, status: s.estado,
          elapsed_minutes: elapsed, is_prolonged: elapsed > CONFIG.PROLONGED_MINUTES,
          area_name: area ? area.nombre : 'N/A',
          machine_name: machine ? machine.nombre : 'N/A',
          machine_code: machine ? machine.codigo : 'N/A',
        };
      });
  }

  if (action === 'by-machine') {
    const machines = sheetToObjects(getSheet(SHEETS.MACHINES)).filter(m => m.activo === 'true');
    return machines.map(m => {
      const mStops = filtered.filter(s => s.maquina_id === m.id);
      const durations = mStops.filter(s => s.duracion_minutos).map(s => parseFloat(s.duracion_minutos));
      return {
        machine_id: m.id, machine_code: m.codigo, machine_name: m.nombre,
        total_stoppages: mStops.length,
        total_downtime_hours: Math.round(durations.reduce((a,b)=>a+b,0)/60*10)/10,
      };
    }).filter(m => m.total_stoppages > 0).sort((a,b) => b.total_stoppages - a.total_stoppages).slice(0, 10);
  }

  return {};
}

// ─── Users ────────────────────────────────────────────────────────────────────

function handleUsers(action, e, user) {
  requireRole(user, ['administrador', 'super_administrador']);
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const id = e.parameter.id;

  if (action === 'list') {
    return sheetToObjects(getSheet(SHEETS.USERS)).map(sanitizeUser);
  }

  if (action === 'create') {
    const newUser = {
      id: generateId(), username: body.username, email: body.email,
      nombre_completo: body.full_name, password: body.password,
      rol: body.role || 'operador', area_id: body.area_id || '',
      color: body.avatar_color || '#6366F1', activo: 'true',
      creado_en: new Date().toISOString(), ultimo_acceso: ''
    };
    appendRow(SHEETS.USERS, newUser);
    return sanitizeUser(newUser);
  }

  if (action === 'update') {
    const updates = {};
    if (body.full_name) updates.nombre_completo = body.full_name;
    if (body.email) updates.email = body.email;
    if (body.role) updates.rol = body.role;
    if (body.area_id !== undefined) updates.area_id = body.area_id;
    if (body.is_active !== undefined) updates.activo = String(body.is_active);
    updateRowById(SHEETS.USERS, id, updates);
    return { ok: true };
  }

  if (action === 'delete') {
    updateRowById(SHEETS.USERS, id, { activo: 'false' });
    return { ok: true };
  }

  return [];
}

// ─── Reasons ──────────────────────────────────────────────────────────────────

function handleReasons(action, e, user) {
  return sheetToObjects(getSheet(SHEETS.REASONS))
    .filter(r => r.activo === 'true')
    .map(r => ({ id: r.id, name: r.nombre, category: r.categoria }));
}

// ─── Helpers de Sheets ────────────────────────────────────────────────────────

function getSpreadsheet() {
  const configSheet = SpreadsheetApp.getActiveSpreadsheet();
  return configSheet;
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] || ''); });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length === 0 || (data.length === 1 && data[0][0] === '')) {
    // Create headers from object keys
    sheet.getRange(1, 1, 1, Object.keys(obj).length).setValues([Object.keys(obj)]);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRowById(sheetName, id, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Object.entries(updates).forEach(([key, value]) => {
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(i + 1, col + 1).setValue(value);
        }
      });
      return;
    }
  }
}

function deleteRowById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function generateId() {
  return Utilities.getUuid().split('-')[0];
}

function generateFolio() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).substring(2,6).toUpperCase();
  return `PAR-${date}-${rand}`;
}

function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function requireRole(user, roles) {
  if (!roles.includes(user.rol)) {
    throw new Error(`Se requiere uno de los roles: ${roles.join(', ')}`);
  }
}

// ─── Inicialización ───────────────────────────────────────────────────────────

function inicializarSistema() {
  Logger.log('Inicializando MantenPro...');

  // Crear Areas
  const areasData = [
    { id: 'area1', nombre: 'Producción', descripcion: 'Líneas de producción', color: '#3B82F6', activo: 'true', creado_en: new Date().toISOString(), creado_por: 'system' },
    { id: 'area2', nombre: 'Ensamble', descripcion: 'Área de ensamblaje', color: '#10B981', activo: 'true', creado_en: new Date().toISOString(), creado_por: 'system' },
    { id: 'area3', nombre: 'Calidad', descripcion: 'Control de calidad', color: '#F59E0B', activo: 'true', creado_en: new Date().toISOString(), creado_por: 'system' },
    { id: 'area4', nombre: 'Mantenimiento', descripcion: 'Taller de mantenimiento', color: '#EF4444', activo: 'true', creado_en: new Date().toISOString(), creado_por: 'system' },
  ];

  const subareasData = [
    { id: 'sub1', nombre: 'Línea 1', descripcion: '', area_id: 'area1', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'sub2', nombre: 'Línea 2', descripcion: '', area_id: 'area1', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'sub3', nombre: 'Ensamble A', descripcion: '', area_id: 'area2', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'sub4', nombre: 'Ensamble B', descripcion: '', area_id: 'area2', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'sub5', nombre: 'Inspección Visual', descripcion: '', area_id: 'area3', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'sub6', nombre: 'Taller Mecánico', descripcion: '', area_id: 'area4', activo: 'true', creado_en: new Date().toISOString() },
  ];

  const machinesData = [
    { id: 'maq1', codigo: 'L1-001', nombre: 'Torno CNC Alpha', subarea_id: 'sub1', marca: 'HAAS', modelo: 'ST-10', serie: '', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'maq2', codigo: 'L1-002', nombre: 'Fresadora Vertical', subarea_id: 'sub1', marca: 'Mazak', modelo: 'VCN-500', serie: '', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'maq3', codigo: 'L2-001', nombre: 'Prensa Hidráulica', subarea_id: 'sub2', marca: 'Schuler', modelo: '', serie: '', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'maq4', codigo: 'EA-001', nombre: 'Robot Soldador', subarea_id: 'sub3', marca: 'FANUC', modelo: 'ARC Mate', serie: '', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'maq5', codigo: 'EB-001', nombre: 'Soldadora MIG', subarea_id: 'sub4', marca: 'Lincoln', modelo: '', serie: '', activo: 'true', creado_en: new Date().toISOString() },
    { id: 'maq6', codigo: 'TM-001', nombre: 'Compresor de Aire', subarea_id: 'sub6', marca: 'Ingersoll Rand', modelo: '', serie: '', activo: 'true', creado_en: new Date().toISOString() },
  ];

  const usersData = [
    { id: 'u1', username: 'superadmin', email: 'superadmin@empresa.com', nombre_completo: 'Super Administrador', password: 'Admin123!', rol: 'super_administrador', area_id: '', color: '#7C3AED', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
    { id: 'u2', username: 'admin', email: 'admin@empresa.com', nombre_completo: 'Administrador Sistema', password: 'Admin123!', rol: 'administrador', area_id: '', color: '#DC2626', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
    { id: 'u3', username: 'gerente', email: 'gerente@empresa.com', nombre_completo: 'Carlos Rodríguez', password: 'Admin123!', rol: 'gerente', area_id: '', color: '#059669', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
    { id: 'u4', username: 'supervisor1', email: 'supervisor1@empresa.com', nombre_completo: 'José Martínez', password: 'Admin123!', rol: 'supervisor', area_id: 'area1', color: '#0284C7', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
    { id: 'u5', username: 'operador1', email: 'operador1@empresa.com', nombre_completo: 'Ana Torres', password: 'Admin123!', rol: 'operador', area_id: 'area1', color: '#BE185D', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
    { id: 'u6', username: 'jefe_prod', email: 'jefe@empresa.com', nombre_completo: 'María López', password: 'Admin123!', rol: 'jefe', area_id: 'area1', color: '#D97706', activo: 'true', creado_en: new Date().toISOString(), ultimo_acceso: '' },
  ];

  const reasonsData = [
    { id: 'r1', nombre: 'Falla eléctrica', categoria: 'electrica', activo: 'true' },
    { id: 'r2', nombre: 'Rotura de rodamiento', categoria: 'mecanica', activo: 'true' },
    { id: 'r3', nombre: 'Desgaste de herramienta', categoria: 'mecanica', activo: 'true' },
    { id: 'r4', nombre: 'Error de operador', categoria: 'operacional', activo: 'true' },
    { id: 'r5', nombre: 'Falta de material', categoria: 'operacional', activo: 'true' },
    { id: 'r6', nombre: 'Producto no conforme', categoria: 'calidad', activo: 'true' },
    { id: 'r7', nombre: 'Mantenimiento preventivo', categoria: 'otro', activo: 'true' },
    { id: 'r8', nombre: 'Sensor averiado', categoria: 'electrica', activo: 'true' },
    { id: 'r9', nombre: 'Fuga hidráulica', categoria: 'mecanica', activo: 'true' },
  ];

  // Limpiar e insertar
  [SHEETS.AREAS, SHEETS.SUBAREAS, SHEETS.MACHINES, SHEETS.USERS, SHEETS.REASONS, SHEETS.STOPPAGES].forEach(name => {
    const sheet = getSheet(name);
    sheet.clear();
  });

  areasData.forEach(r => appendRow(SHEETS.AREAS, r));
  subareasData.forEach(r => appendRow(SHEETS.SUBAREAS, r));
  machinesData.forEach(r => appendRow(SHEETS.MACHINES, r));
  usersData.forEach(r => appendRow(SHEETS.USERS, r));
  reasonsData.forEach(r => appendRow(SHEETS.REASONS, r));

  // Crear hoja de paradas con headers
  const stoppageHeaders = ['id','folio','area_id','subarea_id','maquina_id','inicio','fin','duracion_minutos','motivo_id','motivo_custom','tipo','descripcion','notas_resolucion','estado','reporter_id','alerta_prolongada','creado_en','actualizado_en'];
  const stopSheet = getSheet(SHEETS.STOPPAGES);
  stopSheet.getRange(1, 1, 1, stoppageHeaders.length).setValues([stoppageHeaders]);

  Logger.log('✅ Sistema inicializado correctamente');
  Logger.log('Usuarios creados: superadmin, admin, gerente, supervisor1, operador1, jefe_prod');
  Logger.log('Contraseña para todos: Admin123!');
}
