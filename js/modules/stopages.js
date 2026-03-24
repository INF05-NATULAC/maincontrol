/**
 * MaintControl - Stopages Module
 * Full CRUD for machine stop records.
 */

window.StopagesModule = (() => {
  let currentFilters = {};
  let editingId = null;

  function render(container, param) {
    container.innerHTML = `
      <div class="module-header">
        <h2><span class="icon">🛑</span> Registro de Paradas</h2>
        <div class="header-actions">
          ${AuthService.can('createStopage') ? `<button class="btn btn-primary" onclick="StopagesModule.openForm()">+ Nueva Parada</button>` : ''}
          ${AuthService.can('exportReports') ? `
            <button class="btn btn-ghost btn-sm" onclick="StopagesModule.exportExcel()">📊 Excel</button>
            <button class="btn btn-ghost btn-sm" onclick="StopagesModule.exportPDF()">📄 PDF</button>
          ` : ''}
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar" id="filterBar">
        <div class="filter-row">
          <select id="fArea" class="input-sm" onchange="StopagesModule.onAreaChange()">
            <option value="">Todas las áreas</option>
            ${renderAreaOptions()}
          </select>
          <select id="fSubarea" class="input-sm" onchange="StopagesModule.applyFilters()">
            <option value="">Todas las subáreas</option>
          </select>
          <select id="fMachine" class="input-sm" onchange="StopagesModule.applyFilters()">
            <option value="">Todas las máquinas</option>
          </select>
          <select id="fStatus" class="input-sm" onchange="StopagesModule.applyFilters()">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
        <div class="filter-row">
          <input type="date" id="fDateFrom" class="input-sm" onchange="StopagesModule.applyFilters()" placeholder="Desde">
          <input type="date" id="fDateTo" class="input-sm" onchange="StopagesModule.applyFilters()" placeholder="Hasta">
          <select id="fReason" class="input-sm" onchange="StopagesModule.applyFilters()">
            <option value="">Todos los motivos</option>
            ${DataService.getAll('stopReasons').map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-ghost" onclick="StopagesModule.clearFilters()">✕ Limpiar</button>
        </div>
      </div>

      <!-- Results count -->
      <div style="color:#64748b;font-size:13px;margin:8px 0" id="resultsCount"></div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table" id="stopagesTable">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Máquina</th>
              <th>Área / Subárea</th>
              <th>Motivo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Duración</th>
              <th>Responsable</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="stopagesBody"></tbody>
        </table>
      </div>

      <!-- Form Modal -->
      <div class="modal-overlay" id="stopageModal" style="display:none">
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="modalTitle">Nueva Parada</h3>
            <button class="modal-close" onclick="StopagesModule.closeForm()">✕</button>
          </div>
          <div class="modal-body" id="modalBody"></div>
        </div>
      </div>
    `;

    applyFilters();

    // Handle param (e.g., 'edit:st1')
    if (param && param.startsWith('edit:')) {
      const id = param.split(':')[1];
      setTimeout(() => openForm(id), 100);
    }
  }

  function renderAreaOptions() {
    return DataService.getAll('areas')
      .filter(a => AuthService.canAccessArea(a.id))
      .map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }

  function onAreaChange() {
    const areaId = document.getElementById('fArea')?.value;
    const subSel = document.getElementById('fSubarea');
    if (!subSel) return;
    const subs = DataService.getAll('subareas').filter(s => !areaId || s.areaId === areaId);
    subSel.innerHTML = '<option value="">Todas las subáreas</option>' +
      subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    // Reset machine
    const machSel = document.getElementById('fMachine');
    if (machSel) machSel.innerHTML = '<option value="">Todas las máquinas</option>';
    applyFilters();
  }

  function applyFilters() {
    currentFilters = {
      areaId: document.getElementById('fArea')?.value || '',
      subareaId: document.getElementById('fSubarea')?.value || '',
      machineId: document.getElementById('fMachine')?.value || '',
      status: document.getElementById('fStatus')?.value || '',
      dateFrom: document.getElementById('fDateFrom')?.value || '',
      dateTo: document.getElementById('fDateTo')?.value || '',
      reasonId: document.getElementById('fReason')?.value || '',
    };
    Object.keys(currentFilters).forEach(k => { if (!currentFilters[k]) delete currentFilters[k]; });
    renderTable(DataService.getStopages(currentFilters));
  }

  function clearFilters() {
    ['fArea','fSubarea','fMachine','fStatus','fDateFrom','fDateTo','fReason'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    currentFilters = {};
    renderTable(DataService.getStopages());
  }

  function renderTable(stopages) {
    const body = document.getElementById('stopagesBody');
    const count = document.getElementById('resultsCount');
    if (!body) return;
    if (count) count.textContent = `${stopages.length} resultado${stopages.length !== 1 ? 's' : ''}`;

    if (!stopages.length) {
      body.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#64748b;padding:40px">No hay paradas registradas</td></tr>`;
      return;
    }

    const statusBadge = {
      pendiente: '<span class="badge badge-red">Pendiente</span>',
      en_proceso: '<span class="badge badge-yellow">En Proceso</span>',
      finalizado: '<span class="badge badge-green">Finalizado</span>'
    };

    body.innerHTML = stopages.map(s => {
      const machine = DataService.getById('machines', s.machineId);
      const area = DataService.getById('areas', s.areaId);
      const subarea = DataService.getById('subareas', s.subareaId);
      const reason = DataService.getById('stopReasons', s.reasonId);
      const responsible = DataService.getById('users', s.responsibleId);
      const dur = s.duration != null ? `${Math.floor(s.duration/60)}h ${s.duration%60}m` : s.status === 'finalizado' ? '—' : `<span class="live-dur" data-start="${s.startAt}">…</span>`;
      const canEdit = AuthService.can('editStopage');
      const canDel = AuthService.can('deleteStopage');

      return `
        <tr class="${s.status === 'en_proceso' ? 'row-active' : ''}">
          <td>${statusBadge[s.status] || s.status}</td>
          <td><strong>${machine?.name || '—'}</strong><br><small>${machine?.code || ''}</small></td>
          <td>${area?.name || '—'}<br><small>${subarea?.name || '—'}</small></td>
          <td>${reason?.name || '—'}<br><small style="color:#64748b">${s.reasonFree || ''}</small></td>
          <td>${s.startAt ? new Date(s.startAt).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
          <td>${s.endAt ? new Date(s.endAt).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
          <td class="mono">${dur}</td>
          <td>${responsible?.name || '—'}</td>
          <td class="actions">
            ${canEdit ? `<button class="btn-icon" onclick="StopagesModule.openForm('${s.id}')" title="Editar">✏️</button>` : ''}
            ${canDel ? `<button class="btn-icon btn-icon-danger" onclick="StopagesModule.deleteStopage('${s.id}')" title="Eliminar">🗑️</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    // Update live durations
    updateLiveDurations();
  }

  function updateLiveDurations() {
    document.querySelectorAll('.live-dur').forEach(el => {
      const start = new Date(el.dataset.start);
      const elapsed = Math.round((new Date() - start) / 60000);
      el.textContent = `${Math.floor(elapsed/60)}h ${elapsed%60}m ⏳`;
    });
  }

  function openForm(id = null) {
    editingId = id;
    const modal = document.getElementById('stopageModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!modal) return;

    const stopage = id ? DataService.getById('stopages', id) : null;
    const user = AuthService.getUser();
    const canEditTime = AuthService.can('editStartEndTime');

    // Build area/subarea/machine options
    const areas = DataService.getAll('areas').filter(a => AuthService.canAccessArea(a.id));
    const selAreaId = stopage?.areaId || (areas[0]?.id || '');
    const subareas = DataService.getAll('subareas').filter(s => s.areaId === selAreaId);
    const selSubId = stopage?.subareaId || (subareas[0]?.id || '');
    const machines = DataService.getAll('machines').filter(m => m.subareaId === selSubId);
    const reasons = DataService.getAll('stopReasons');

    title.textContent = id ? 'Editar Parada' : 'Nueva Parada';

    const now = new Date().toISOString().slice(0,16);

    body.innerHTML = `
      <form id="stopageForm">
        <div class="form-grid">
          <div class="form-group">
            <label>Área *</label>
            <select id="fmArea" class="input" required onchange="StopagesModule.formAreaChange()">
              ${areas.map(a => `<option value="${a.id}" ${a.id===selAreaId?'selected':''}>${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Subárea *</label>
            <select id="fmSubarea" class="input" required onchange="StopagesModule.formSubareaChange()">
              ${subareas.map(s => `<option value="${s.id}" ${s.id===selSubId?'selected':''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Máquina *</label>
            <select id="fmMachine" class="input" required>
              ${machines.map(m => `<option value="${m.id}" ${m.id===stopage?.machineId?'selected':''}>${m.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Motivo *</label>
            <select id="fmReason" class="input" required>
              ${reasons.map(r => `<option value="${r.id}" ${r.id===stopage?.reasonId?'selected':''}>${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>Descripción adicional</label>
            <input type="text" id="fmReasonFree" class="input" value="${stopage?.reasonFree||''}" placeholder="Detalles del motivo...">
          </div>
          <div class="form-group">
            <label>Fecha/Hora Inicio ${canEditTime ? '' : '<small>(auto)</small>'}</label>
            <input type="datetime-local" id="fmStart" class="input" value="${stopage?.startAt||now}" ${canEditTime?'':'readonly'} required>
          </div>
          <div class="form-group">
            <label>Fecha/Hora Fin</label>
            <input type="datetime-local" id="fmEnd" class="input" value="${stopage?.endAt||''}" ${canEditTime?'':stopage?.status==='finalizado'?'readonly':''}>
          </div>
          <div class="form-group">
            <label>Estado *</label>
            <select id="fmStatus" class="input" ${AuthService.can('changeStatus')?'':'disabled'}>
              <option value="pendiente" ${stopage?.status==='pendiente'?'selected':''}>Pendiente</option>
              <option value="en_proceso" ${stopage?.status==='en_proceso'?'selected':''}>En Proceso</option>
              <option value="finalizado" ${stopage?.status==='finalizado'?'selected':''}>Finalizado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Responsable</label>
            <input type="text" class="input" value="${user?.name||''}" readonly>
          </div>
          <div class="form-group full">
            <label>Notas / Observaciones</label>
            <textarea id="fmNotes" class="input" rows="3" placeholder="Observaciones adicionales...">${stopage?.notes||''}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="StopagesModule.closeForm()">Cancelar</button>
          <button type="submit" class="btn btn-primary">💾 Guardar</button>
        </div>
      </form>
    `;

    document.getElementById('stopageForm').addEventListener('submit', submitForm);
    modal.style.display = 'flex';
    modal.addEventListener('click', e => { if (e.target === modal) closeForm(); });
  }

  function formAreaChange() {
    const areaId = document.getElementById('fmArea')?.value;
    const subSel = document.getElementById('fmSubarea');
    const subs = DataService.getAll('subareas').filter(s => s.areaId === areaId);
    subSel.innerHTML = subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    formSubareaChange();
  }

  function formSubareaChange() {
    const subId = document.getElementById('fmSubarea')?.value;
    const machSel = document.getElementById('fmMachine');
    const machs = DataService.getAll('machines').filter(m => m.subareaId === subId);
    machSel.innerHTML = machs.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  }

  function submitForm(e) {
    e.preventDefault();
    const user = AuthService.getUser();
    const startAt = document.getElementById('fmStart')?.value;
    const endAt = document.getElementById('fmEnd')?.value || null;
    const status = document.getElementById('fmStatus')?.value;

    // Auto-set endAt if finalizado and no end
    const resolvedEnd = (status === 'finalizado' && !endAt) ? new Date().toISOString().slice(0,16) : endAt;
    const duration = DataService.calcDuration(startAt, resolvedEnd);

    const data = {
      areaId: document.getElementById('fmArea')?.value,
      subareaId: document.getElementById('fmSubarea')?.value,
      machineId: document.getElementById('fmMachine')?.value,
      reasonId: document.getElementById('fmReason')?.value,
      reasonFree: document.getElementById('fmReasonFree')?.value || '',
      startAt,
      endAt: resolvedEnd,
      status,
      duration,
      notes: document.getElementById('fmNotes')?.value || '',
      responsibleId: user.id,
    };

    if (editingId) {
      DataService.update('stopages', editingId, data);
      NotificationService.showToast('Parada actualizada', 'Los cambios se guardaron correctamente', 'success');
    } else {
      DataService.create('stopages', data);
      NotificationService.showToast('Parada registrada', 'El evento se registró correctamente', 'success');
    }

    closeForm();
    applyFilters();
    window.dispatchEvent(new CustomEvent('data-changed'));
  }

  function closeForm() {
    const modal = document.getElementById('stopageModal');
    if (modal) modal.style.display = 'none';
    editingId = null;
  }

  function deleteStopage(id) {
    if (!confirm('¿Eliminar esta parada? Esta acción no se puede deshacer.')) return;
    DataService.remove('stopages', id);
    NotificationService.showToast('Parada eliminada', '', 'info');
    applyFilters();
  }

  function exportExcel() {
    if (!window.XLSX) { NotificationService.showToast('Error', 'Librería Excel no disponible', 'error'); return; }
    const stopages = DataService.getStopages(currentFilters);
    const rows = stopages.map(s => ({
      'Estado': s.status,
      'Área': DataService.getById('areas', s.areaId)?.name || '',
      'Subárea': DataService.getById('subareas', s.subareaId)?.name || '',
      'Máquina': DataService.getById('machines', s.machineId)?.name || '',
      'Motivo': DataService.getById('stopReasons', s.reasonId)?.name || '',
      'Descripción': s.reasonFree || '',
      'Inicio': s.startAt,
      'Fin': s.endAt || '',
      'Duración (min)': s.duration || '',
      'Responsable': DataService.getById('users', s.responsibleId)?.name || '',
      'Notas': s.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paradas');
    XLSX.writeFile(wb, `paradas_${new Date().toISOString().split('T')[0]}.xlsx`);
    NotificationService.showToast('Excel exportado', '', 'success');
  }

  function exportPDF() {
    const stopages = DataService.getStopages(currentFilters);
    const rows = stopages.map(s => {
      const m = DataService.getById('machines', s.machineId);
      const a = DataService.getById('areas', s.areaId);
      const r = DataService.getById('stopReasons', s.reasonId);
      const u = DataService.getById('users', s.responsibleId);
      const dur = s.duration ? `${Math.floor(s.duration/60)}h ${s.duration%60}m` : '—';
      return [s.status, m?.name||'', a?.name||'', r?.name||'', s.startAt||'', dur, u?.name||''];
    });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>Reporte de Paradas</title>
      <style>body{font-family:sans-serif;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#0a0f1e;color:#fff}tr:nth-child(even){background:#f8f8f8}</style>
      </head><body>
      <h1>MaintControl - Reporte de Paradas</h1>
      <p>Generado: ${new Date().toLocaleString('es-MX')} | Total: ${stopages.length}</p>
      <table><thead><tr><th>Estado</th><th>Máquina</th><th>Área</th><th>Motivo</th><th>Inicio</th><th>Duración</th><th>Responsable</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`);
    printWin.document.close();
    printWin.print();
  }

  return { render, openForm, closeForm, formAreaChange, formSubareaChange, applyFilters, clearFilters, onAreaChange, deleteStopage, exportExcel, exportPDF };
})();
