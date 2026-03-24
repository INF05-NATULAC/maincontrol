/**
 * MaintControl - Dashboard Module
 * Real-time indicators and charts.
 */

window.DashboardModule = (() => {
  let charts = {};
  let refreshTimer = null;

  function render(container) {
    const user = AuthService.getUser();
    container.innerHTML = `
      <div class="module-header">
        <h2><span class="icon">📊</span> Dashboard en Tiempo Real</h2>
        <div class="header-actions">
          <span class="online-badge" id="onlineBadge"></span>
          <button class="btn btn-sm btn-ghost" onclick="DashboardModule.refresh()">↻ Actualizar</button>
          <select id="dashPeriod" class="input-sm" onchange="DashboardModule.refresh()">
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" id="kpiGrid"></div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <div class="chart-card wide">
          <h3>Paradas por Día (últimos 7 días)</h3>
          <canvas id="chartTimeline" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3>Por Área</h3>
          <canvas id="chartByArea" height="220"></canvas>
        </div>
        <div class="chart-card">
          <h3>Distribución por Estado</h3>
          <canvas id="chartStatus" height="220"></canvas>
        </div>
        <div class="chart-card wide">
          <h3>Top Máquinas con más Paradas</h3>
          <canvas id="chartMachines" height="200"></canvas>
        </div>
      </div>

      <!-- Recent Stopages -->
      <div class="card mt-4">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0">Paradas Recientes</h3>
          <button class="btn btn-sm btn-primary" onclick="App.navigate('stopages')">Ver todas</button>
        </div>
        <div id="recentStopages"></div>
      </div>

      <!-- Prolonged stop alerts -->
      <div id="prolongedAlerts" style="margin-top:16px"></div>
    `;

    refresh();
    startAutoRefresh();

    // Listen for prolonged stops
    window.addEventListener('prolonged-stop', (e) => {
      renderProlongedAlerts();
    });
  }

  function refresh() {
    const periodEl = document.getElementById('dashPeriod');
    const days = periodEl ? parseInt(periodEl.value) : 7;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const filters = { dateFrom: dateFrom.toISOString().split('T')[0] };

    // Apply area filter for non-admins
    const user = AuthService.getUser();
    if (!AuthService.can('viewAllAreas') && user.areas?.length) {
      // Filter handled in stats
    }

    const stats = DataService.getDashboardStats(filters);
    renderKPIs(stats);
    renderCharts(stats);
    renderRecentStopages(stats.recent);
    renderProlongedAlerts();
    updateOnlineBadge();
  }

  function renderKPIs(stats) {
    const grid = document.getElementById('kpiGrid');
    if (!grid) return;

    const h = m => { const h = Math.floor(m/60); const min = m%60; return h ? `${h}h ${min}m` : `${m}m`; };

    const kpis = [
      { icon:'🛑', label:'Total Paradas', value: stats.total, sub:'en el periodo', color:'#ef4444' },
      { icon:'⏱️', label:'Tiempo Total', value: h(stats.totalDuration), sub:'de parada acumulada', color:'#f59e0b' },
      { icon:'📈', label:'Duración Promedio', value: h(stats.avgDuration), sub:'por evento', color:'#3b82f6' },
      { icon:'🔴', label:'Pendientes', value: stats.byStatus.pendiente, sub:'sin atender', color:'#ef4444' },
      { icon:'🟡', label:'En Proceso', value: stats.byStatus.en_proceso, sub:'en atención', color:'#f59e0b' },
      { icon:'🟢', label:'Finalizadas', value: stats.byStatus.finalizado, sub:'resueltas', color:'#10b981' },
    ];

    grid.innerHTML = kpis.map(k => `
      <div class="kpi-card" style="--kpi-color:${k.color}">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-value" style="color:${k.color}">${k.value}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>
    `).join('');
  }

  function renderCharts(stats) {
    const chartOpts = {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
      scales: {}
    };

    const darkScale = {
      ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(148,163,184,0.1)' }
    };

    // Timeline chart
    destroyChart('chartTimeline');
    const tlEl = document.getElementById('chartTimeline');
    if (tlEl && window.Chart) {
      charts.chartTimeline = new Chart(tlEl, {
        type: 'line',
        data: {
          labels: stats.timeSeries.map(d => new Date(d.date).toLocaleDateString('es-MX', {weekday:'short', day:'numeric'})),
          datasets: [
            {
              label: 'Paradas',
              data: stats.timeSeries.map(d => d.count),
              borderColor: '#00d4ff',
              backgroundColor: 'rgba(0,212,255,0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#00d4ff',
              pointRadius: 5
            },
            {
              label: 'Duración (min)',
              data: stats.timeSeries.map(d => d.duration),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f59e0b',
              pointRadius: 5,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          ...chartOpts,
          scales: {
            x: darkScale,
            y: { ...darkScale, title: { display: true, text: 'Paradas', color: '#94a3b8' } },
            y1: { ...darkScale, position: 'right', title: { display: true, text: 'Minutos', color: '#94a3b8' } }
          }
        }
      });
    }

    // Area chart
    destroyChart('chartByArea');
    const areaEl = document.getElementById('chartByArea');
    if (areaEl && window.Chart) {
      const areas = Object.values(stats.byArea).filter(a => a.count > 0);
      charts.chartByArea = new Chart(areaEl, {
        type: 'bar',
        data: {
          labels: areas.map(a => a.name),
          datasets: [{
            label: 'Paradas',
            data: areas.map(a => a.count),
            backgroundColor: ['#00d4ff','#f59e0b','#10b981','#a855f7','#ef4444'],
          }]
        },
        options: { ...chartOpts, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: darkScale, y: darkScale } }
      });
    }

    // Status donut
    destroyChart('chartStatus');
    const statusEl = document.getElementById('chartStatus');
    if (statusEl && window.Chart) {
      charts.chartStatus = new Chart(statusEl, {
        type: 'doughnut',
        data: {
          labels: ['Pendiente', 'En Proceso', 'Finalizado'],
          datasets: [{
            data: [stats.byStatus.pendiente, stats.byStatus.en_proceso, stats.byStatus.finalizado],
            backgroundColor: ['#ef4444','#f59e0b','#10b981'],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: { ...chartOpts, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16 } } } }
      });
    }

    // Machines bar
    destroyChart('chartMachines');
    const machEl = document.getElementById('chartMachines');
    if (machEl && window.Chart) {
      const machines = Object.values(stats.byMachine).filter(m => m.count > 0)
        .sort((a,b) => b.count - a.count).slice(0,8);
      charts.chartMachines = new Chart(machEl, {
        type: 'bar',
        data: {
          labels: machines.map(m => m.name.length > 15 ? m.name.substr(0,15)+'…' : m.name),
          datasets: [{
            label: 'Paradas',
            data: machines.map(m => m.count),
            backgroundColor: 'rgba(0,212,255,0.7)',
            borderColor: '#00d4ff',
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: { ...chartOpts, plugins: { legend: { display: false } }, scales: { x: darkScale, y: darkScale } }
      });
    }
  }

  function renderRecentStopages(stopages) {
    const el = document.getElementById('recentStopages');
    if (!el) return;
    if (!stopages.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;padding:20px">No hay paradas registradas</p>'; return; }

    el.innerHTML = stopages.map(s => {
      const machine = DataService.getById('machines', s.machineId);
      const area = DataService.getById('areas', s.areaId);
      const reason = DataService.getById('stopReasons', s.reasonId);
      const responsible = DataService.getById('users', s.responsibleId);
      const statusInfo = { pendiente: ['🔴','#ef4444'], en_proceso: ['🟡','#f59e0b'], finalizado: ['🟢','#10b981'] }[s.status];
      const dur = s.duration ? `${Math.floor(s.duration/60)}h ${s.duration%60}m` : 'En curso';

      return `
        <div class="stopage-row" onclick="App.navigate('stopages','edit:${s.id}')">
          <div class="stopage-status" style="color:${statusInfo[1]}">${statusInfo[0]}</div>
          <div class="stopage-info">
            <strong>${machine?.name || '—'}</strong>
            <span>${area?.name || '—'} · ${reason?.name || '—'}</span>
          </div>
          <div class="stopage-meta">
            <span>${new Date(s.startAt).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</span>
            <span class="duration">${dur}</span>
          </div>
          <div class="stopage-responsible">${responsible?.name || '—'}</div>
        </div>
      `;
    }).join('');
  }

  function renderProlongedAlerts() {
    const el = document.getElementById('prolongedAlerts');
    if (!el) return;
    const config = DataService.getAll('alertConfig')[0] || { prolongedStopMinutes: 60 };
    const threshold = config.prolongedStopMinutes || 60;
    const now = new Date();
    const active = DataService.getAll('stopages').filter(s => s.status !== 'finalizado');
    const prolonged = active.filter(s => Math.round((now - new Date(s.startAt)) / 60000) >= threshold);

    if (!prolonged.length) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <div class="alert-banner">
        <h4>⚠️ Paradas Prolongadas (>${threshold} min)</h4>
        ${prolonged.map(s => {
          const m = DataService.getById('machines', s.machineId);
          const elapsed = Math.round((now - new Date(s.startAt)) / 60000);
          return `<div class="alert-item">🔴 <strong>${m?.name || '—'}</strong> lleva ${elapsed} minutos detenida</div>`;
        }).join('')}
      </div>`;
  }

  function updateOnlineBadge() {
    const el = document.getElementById('onlineBadge');
    if (!el) return;
    const online = navigator.onLine;
    el.innerHTML = `<span class="badge ${online ? 'badge-online' : 'badge-offline'}">${online ? '● Online' : '○ Offline'}</span>`;
  }

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refresh, 30000); // Every 30s
  }

  function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
  }

  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  function destroy() {
    stopAutoRefresh();
    Object.keys(charts).forEach(destroyChart);
  }

  return { render, refresh, destroy };
})();
