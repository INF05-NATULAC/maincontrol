/**
 * MaintControl - Admin Module
 * CRUD panels for areas, subareas, machines, users, reasons, and config.
 */

window.AdminModule = (() => {
  let activeTab = 'areas';

  function render(container) {
    if (!AuthService.hasLevel('supervisor')) {
      container.innerHTML = '<div class="empty-state">🔒 No tienes permisos para acceder a esta sección.</div>';
      return;
    }

    const tabs = [
      { id:'areas', label:'🏭 Áreas', roles:['superadmin'] },
      { id:'subareas', label:'📍 Subáreas', roles:['superadmin'] },
      { id:'machines', label:'⚙️ Máquinas', roles:['superadmin','admin'] },
      { id:'users', label:'👤 Usuarios', roles:['superadmin','admin'] },
      { id:'reasons', label:'📋 Motivos', roles:['superadmin','admin'] },
      { id:'config', label:'⚙️ Configuración', roles:['superadmin','admin','gerente'] },
    ].filter(t => AuthService.hasLevel(t.roles.at(-1)));

    container.innerHTML = `
      <div class="module-header">
        <h2><span class="icon">🔧</span> Administración</h2>
      </div>
      <div class="tabs">
        ${tabs.map(t => `<button class="tab ${t.id===activeTab?'active':''}" onclick="AdminModule.switchTab('${t.id}')">${t.label}</button>`).join('')}
      </div>
      <div id="adminContent"></div>
    `;

    switchTab(activeTab);
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent.includes(tab) || t.getAttribute('onclick')?.includes(tab)));
    const content = document.getElementById('adminContent');
    if (!content) return;
    const renderers = { areas: renderAreas, subareas: renderSubareas, machines: renderMachines, users: renderUsers, reasons: renderReasons, config: renderConfig };
    if (renderers[tab]) renderers[tab](content);
  }

  // ─── Generic list renderer ─────────────────────────────────────────────
  function genericList({ collection, title, columns, renderRow, formHtml, onCreate, onEdit, canCreate, canEdit, canDelete }) {
    const items = DataService.getAll(collection);
    return `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>${title} <span class="count-badge">${items.length}</span></h3>
          ${canCreate ? `<button class="btn btn-primary" onclick="AdminModule.openModal('${collection}')">+ Agregar</button>` : ''}
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}<th>Acciones</th></tr></thead>
            <tbody>
              ${items.length ? items.map(item => `
                <tr>
                  ${renderRow(item)}
                  <td class="actions">
                    ${canEdit ? `<button class="btn-icon" onclick="AdminModule.openModal('${collection}','${item.id}')">✏️</button>` : ''}
                    ${canDelete ? `<button class="btn-icon btn-icon-danger" onclick="AdminModule.deleteItem('${collection}','${item.id}')">🗑️</button>` : ''}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="${columns.length+1}" class="empty-cell">No hay registros</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-overlay" id="modal_${collection}" style="display:none">
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="modal_${collection}_title">Agregar ${title}</h3>
            <button class="modal-close" onclick="AdminModule.closeModal('${collection}')">✕</button>
          </div>
          <div class="modal-body" id="modal_${collection}_body"></div>
        </div>
      </div>
    `;
  }

  // ─── Areas ─────────────────────────────────────────────────────────────
  function renderAreas(container) {
    const isSA = AuthService.hasLevel('superadmin');
    container.innerHTML = genericList({
      collection: 'areas', title: 'Áreas',
      columns: ['Código', 'Nombre', 'Descripción', 'Estado'],
      renderRow: a => `<td><code>${a.code}</code></td><td><strong>${a.name}</strong></td><td>${a.description||'—'}</td><td>${a.active?'<span class="badge badge-green">Activa</span>':'<span class="badge badge-red">Inactiva</span>'}</td>`,
      canCreate: isSA, canEdit: isSA, canDelete: isSA,
    });
  }

  function renderSubareas(container) {
    const isSA = AuthService.hasLevel('superadmin');
    const areas = DataService.getAll('areas');
    container.innerHTML = genericList({
      collection: 'subareas', title: 'Subáreas',
      columns: ['Código', 'Nombre', 'Área', 'Estado'],
      renderRow: s => {
        const area = areas.find(a => a.id === s.areaId);
        return `<td><code>${s.code}</code></td><td><strong>${s.name}</strong></td><td>${area?.name||'—'}</td><td>${s.active?'<span class="badge badge-green">Activa</span>':'<span class="badge badge-red">Inactiva</span>'}`;
      },
      canCreate: isSA, canEdit: isSA, canDelete: isSA,
    });
  }

  function renderMachines(container) {
    const canManage = AuthService.can('manageMachines');
    const subareas = DataService.getAll('subareas');
    const areas = DataService.getAll('areas');
    container.innerHTML = genericList({
      collection: 'machines', title: 'Máquinas',
      columns: ['Código', 'Nombre', 'Tipo', 'Subárea', 'Estado'],
      renderRow: m => {
        const sub = subareas.find(s => s.id === m.subareaId);
        const area = areas.find(a => a.id === sub?.areaId);
        return `<td><code>${m.code}</code></td><td><strong>${m.name}</strong></td><td>${m.type||'—'}</td><td>${sub?.name||'—'} <small>(${area?.name||''})</small></td><td>${m.active?'<span class="badge badge-green">Activa</span>':'<span class="badge badge-red">Inactiva</span>'}`;
      },
      canCreate: canManage, canEdit: canManage, canDelete: canManage,
    });
  }

  function renderUsers(container) {
    const canManage = AuthService.can('manageUsers');
    const user = AuthService.getUser();
    container.innerHTML = genericList({
      collection: 'users', title: 'Usuarios',
      columns: ['Nombre', 'Email', 'Rol', 'Áreas', 'Estado'],
      renderRow: u => {
        const roleColor = AuthService.getRoleColor(u.role);
        const areaNames = (u.areas||[]).map(aid => DataService.getById('areas', aid)?.name||aid).join(', ');
        return `<td><strong>${u.name}</strong></td><td>${u.email}</td><td><span class="badge" style="background:${roleColor}22;color:${roleColor};border-color:${roleColor}44">${AuthService.getRoleLabel(u.role)}</span></td><td>${areaNames||'Todas'}</td><td>${u.active?'<span class="badge badge-green">Activo</span>':'<span class="badge badge-red">Inactivo</span>'}`;
      },
      canCreate: canManage, canEdit: canManage, canDelete: canManage && user.role === 'superadmin',
    });
  }

  function renderReasons(container) {
    const canManage = AuthService.can('manageReasons');
    container.innerHTML = genericList({
      collection: 'stopReasons', title: 'Motivos de Parada',
      columns: ['Nombre', 'Categoría', 'Estado'],
      renderRow: r => `<td><strong>${r.name}</strong></td><td>${r.category||'—'}</td><td>${r.active?'<span class="badge badge-green">Activo</span>':'<span class="badge badge-red">Inactivo</span>'}`,
      canCreate: canManage, canEdit: canManage, canDelete: canManage,
    });
  }

  function renderConfig(container) {
    const config = DataService.getAll('alertConfig')[0] || { prolongedStopMinutes: 60 };
    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header"><h3>⚙️ Configuración de Alertas</h3></div>
        <div class="form-grid" style="max-width:500px">
          <div class="form-group full">
            <label>Minutos para alerta de parada prolongada</label>
            <input type="number" id="cfgMinutes" class="input" value="${config.prolongedStopMinutes||60}" min="5" max="480">
            <small>Una alerta visual y push será enviada cuando una parada supere este tiempo.</small>
          </div>
          <div class="form-group full">
            <button class="btn btn-primary" onclick="AdminModule.saveConfig()">💾 Guardar Configuración</button>
          </div>
        </div>
        <hr style="border-color:#1e293b;margin:24px 0">
        <div class="panel-header"><h3>🔔 Notificaciones Push</h3></div>
        <p style="color:#94a3b8;font-size:14px">Activa las notificaciones para recibir alertas incluso cuando la app esté en segundo plano.</p>
        <button class="btn btn-ghost" onclick="AdminModule.requestNotifPerm()">🔔 Activar notificaciones push</button>
        <hr style="border-color:#1e293b;margin:24px 0">
        <div class="panel-header"><h3>📦 Datos Offline</h3></div>
        <p style="color:#94a3b8;font-size:14px">Registros pendientes de sincronización: <strong id="offlineCount">—</strong></p>
        <button class="btn btn-ghost" onclick="AdminModule.flushQueue()">☁️ Sincronizar ahora</button>
      </div>
    `;
    const queue = DataService.getAll('offlineQueue');
    const el = document.getElementById('offlineCount');
    if (el) el.textContent = queue.length;
  }

  function saveConfig() {
    const minutes = parseInt(document.getElementById('cfgMinutes')?.value || 60);
    const existing = DataService.getAll('alertConfig');
    if (existing.length) {
      DataService.update('alertConfig', existing[0].id, { prolongedStopMinutes: minutes });
    } else {
      DataService.create('alertConfig', { prolongedStopMinutes: minutes });
    }
    NotificationService.showToast('Configuración guardada', `Umbral: ${minutes} minutos`, 'success');
  }

  async function requestNotifPerm() {
    const granted = await NotificationService.requestPush();
    NotificationService.showToast(granted ? 'Notificaciones activadas ✅' : 'Permiso denegado', '', granted ? 'success' : 'warning');
  }

  async function flushQueue() {
    const n = await DataService.flushOfflineQueue();
    NotificationService.showToast('Sincronización completada', `${n||0} registros enviados`, 'success');
    renderConfig(document.getElementById('adminContent'));
  }

  // ─── Modal CRUD ────────────────────────────────────────────────────────
  function openModal(collection, id = null) {
    const modal = document.getElementById('modal_' + collection);
    const title = document.getElementById('modal_' + collection + '_title');
    const body = document.getElementById('modal_' + collection + '_body');
    if (!modal) return;

    const item = id ? DataService.getById(collection, id) : null;
    title.textContent = (id ? 'Editar' : 'Agregar') + ' ' + { areas:'Área', subareas:'Subárea', machines:'Máquina', users:'Usuario', stopReasons:'Motivo', alertConfig:'Config' }[collection];

    body.innerHTML = buildForm(collection, item);
    body.querySelector('form').addEventListener('submit', e => { e.preventDefault(); saveItem(collection, id, e.target); });
    modal.style.display = 'flex';
    modal.addEventListener('click', ev => { if (ev.target === modal) closeModal(collection); });
  }

  function buildForm(collection, item) {
    const val = (k, def='') => item?.[k] ?? def;
    const chk = (k) => item?.[k] !== false ? 'checked' : '';

    const forms = {
      areas: `
        <form><div class="form-grid">
          <div class="form-group"><label>Código *</label><input class="input" name="code" value="${val('code')}" required placeholder="PROD"></div>
          <div class="form-group"><label>Nombre *</label><input class="input" name="name" value="${val('name')}" required></div>
          <div class="form-group full"><label>Descripción</label><input class="input" name="description" value="${val('description')}"></div>
          <div class="form-group"><label>Estado</label><label class="toggle"><input type="checkbox" name="active" ${chk('active')}><span>Activo</span></label></div>
        </div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="AdminModule.closeModal('areas')">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>`,
      
      subareas: `
        <form><div class="form-grid">
          <div class="form-group"><label>Área *</label><select class="input" name="areaId" required>${DataService.getAll('areas').map(a=>`<option value="${a.id}" ${a.id===val('areaId')?'selected':''}>${a.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Código *</label><input class="input" name="code" value="${val('code')}" required></div>
          <div class="form-group full"><label>Nombre *</label><input class="input" name="name" value="${val('name')}" required></div>
          <div class="form-group"><label>Estado</label><label class="toggle"><input type="checkbox" name="active" ${chk('active')}><span>Activo</span></label></div>
        </div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="AdminModule.closeModal('subareas')">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>`,

      machines: `
        <form><div class="form-grid">
          <div class="form-group"><label>Subárea *</label><select class="input" name="subareaId" required>${DataService.getAll('subareas').map(s=>`<option value="${s.id}" ${s.id===val('subareaId')?'selected':''}>${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Código *</label><input class="input" name="code" value="${val('code')}" required></div>
          <div class="form-group"><label>Nombre *</label><input class="input" name="name" value="${val('name')}" required></div>
          <div class="form-group"><label>Tipo</label><input class="input" name="type" value="${val('type')}"></div>
          <div class="form-group"><label>Estado</label><label class="toggle"><input type="checkbox" name="active" ${chk('active')}><span>Activo</span></label></div>
        </div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="AdminModule.closeModal('machines')">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>`,

      users: `
        <form><div class="form-grid">
          <div class="form-group full"><label>Nombre *</label><input class="input" name="name" value="${val('name')}" required></div>
          <div class="form-group"><label>Email *</label><input class="input" type="email" name="email" value="${val('email')}" required></div>
          <div class="form-group"><label>Contraseña ${item?'(dejar vacío para no cambiar)':''}</label><input class="input" type="password" name="password" ${item?'':'required'}></div>
          <div class="form-group"><label>Rol *</label><select class="input" name="role" required>${AuthService.getRoles().map(r=>`<option value="${r.key}" ${r.key===val('role')?'selected':''}>${r.label}</option>`).join('')}</select></div>
          <div class="form-group full"><label>Áreas (vacío = todas)</label><div class="checkbox-group">${DataService.getAll('areas').map(a=>`<label class="checkbox-item"><input type="checkbox" name="areas" value="${a.id}" ${(item?.areas||[]).includes(a.id)?'checked':''}><span>${a.name}</span></label>`).join('')}</div></div>
          <div class="form-group"><label>Estado</label><label class="toggle"><input type="checkbox" name="active" ${chk('active')}><span>Activo</span></label></div>
        </div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="AdminModule.closeModal('users')">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>`,

      stopReasons: `
        <form><div class="form-grid">
          <div class="form-group full"><label>Nombre *</label><input class="input" name="name" value="${val('name')}" required></div>
          <div class="form-group"><label>Categoría</label><input class="input" name="category" value="${val('category')}"></div>
          <div class="form-group"><label>Estado</label><label class="toggle"><input type="checkbox" name="active" ${chk('active')}><span>Activo</span></label></div>
        </div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="AdminModule.closeModal('stopReasons')">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></form>`,
    };

    return forms[collection] || '<p>Formulario no disponible</p>';
  }

  function saveItem(collection, id, form) {
    const fd = new FormData(form);
    const data = {};
    for (let [k, v] of fd.entries()) {
      if (k === 'areas') {
        data.areas = data.areas || [];
        data.areas.push(v);
      } else {
        data[k] = v;
      }
    }
    // Checkboxes not included if unchecked
    data.active = form.querySelector('[name="active"]')?.checked ?? true;

    if (id) {
      if (!data.password) delete data.password; // don't overwrite with empty
      DataService.update(collection, id, data);
    } else {
      DataService.create(collection, data);
    }

    closeModal(collection);
    NotificationService.showToast('Guardado', 'Registro actualizado correctamente', 'success');
    switchTab(activeTab);
  }

  function closeModal(collection) {
    const modal = document.getElementById('modal_' + collection);
    if (modal) modal.style.display = 'none';
  }

  function deleteItem(collection, id) {
    if (!confirm('¿Eliminar este registro?')) return;
    DataService.remove(collection, id);
    NotificationService.showToast('Eliminado', '', 'info');
    switchTab(activeTab);
  }

  return { render, switchTab, openModal, closeModal, deleteItem, saveConfig, requestNotifPerm, flushQueue };
})();
