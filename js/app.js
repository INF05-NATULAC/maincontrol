/**
 * MaintControl - Main Application
 * SPA router, shell, PWA registration.
 */

window.App = (() => {
  let currentModule = null;
  let liveUpdateTimer = null;

  const routes = {
    dashboard:  { label: 'Dashboard',      icon: '📊', module: 'DashboardModule',  permission: null },
    stopages:   { label: 'Paradas',         icon: '🛑', module: 'StopagesModule',   permission: 'createStopage' },
    admin:      { label: 'Administración',  icon: '🔧', module: 'AdminModule',      permission: 'manageReasons' },
    profile:    { label: 'Mi Perfil',       icon: '👤', module: null,               permission: null },
  };

  function init() {
    // Init services
    DataService.init();
    AuthService.init();
    registerSW();

    // Online/offline events
    window.addEventListener('online', () => {
      NotificationService.showToast('Conexión restaurada', 'Los datos se sincronizarán automáticamente', 'success');
      DataService.flushOfflineQueue();
      updateConnStatus();
    });
    window.addEventListener('offline', () => {
      NotificationService.showToast('Sin conexión', 'Trabajando en modo offline. Los datos se guardan localmente.', 'warning');
      updateConnStatus();
    });

    // Handle SW messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data.type === 'SYNC_START') {
          NotificationService.showToast('Sincronizando...', 'Enviando datos al servidor', 'info');
        }
      });
    }

    // Data changed event (refresh nav counts, etc.)
    window.addEventListener('data-changed', updateNavBadges);

    if (AuthService.isLoggedIn()) {
      renderApp();
    } else {
      renderLogin();
    }
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('[App] SW registered:', reg.scope);
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                NotificationService.showToast('Actualización disponible', 'Recarga la página para aplicar', 'info', 10000);
              }
            });
          });
        })
        .catch(err => console.warn('[App] SW registration failed:', err));
    }
  }

  // ─── Login ─────────────────────────────────────────────────────────────
  function renderLogin() {
    document.body.innerHTML = `
      <div class="login-screen">
        <div class="login-bg"></div>
        <div class="login-card">
          <div class="login-logo">
            <div class="logo-icon">⚙️</div>
            <h1>MaintControl</h1>
            <p>Sistema de Gestión de Paradas Industriales</p>
          </div>
          <form id="loginForm">
            <div class="form-group">
              <label>Correo electrónico</label>
              <input type="email" id="loginEmail" class="input" placeholder="usuario@planta.com" required autocomplete="username">
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" id="loginPass" class="input" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <div id="loginError" class="form-error" style="display:none"></div>
            <button type="submit" class="btn btn-primary btn-full">Iniciar Sesión</button>
          </form>
          <div class="login-demo">
            <p>Usuarios demo:</p>
            <div class="demo-chips">
              <button onclick="App.demoLogin('superadmin@plant.com')">Super Admin</button>
              <button onclick="App.demoLogin('admin@plant.com')">Admin</button>
              <button onclick="App.demoLogin('supervisor@plant.com')">Supervisor</button>
              <button onclick="App.demoLogin('tecnico@plant.com')">Técnico</button>
            </div>
            <small>(contraseña: admin123)</small>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => NotificationService.init(), 100);

    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPass').value;
      const result = AuthService.login(email, pass);
      if (result.success) {
        renderApp();
      } else {
        const errEl = document.getElementById('loginError');
        errEl.textContent = result.error;
        errEl.style.display = 'block';
      }
    });
  }

  function demoLogin(email) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPass').value = 'admin123';
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  }

  // ─── App Shell ──────────────────────────────────────────────────────────
  function renderApp() {
    const user = AuthService.getUser();
    const roleColor = AuthService.getRoleColor(user.role);

    document.body.innerHTML = `
      <!-- Install PWA Banner -->
      <div id="installBanner" class="install-banner" style="display:none">
        <span>📱 Instala MaintControl como aplicación</span>
        <button class="btn btn-sm btn-primary" id="installBtn">Instalar</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('installBanner').style.display='none'">✕</button>
      </div>

      <!-- Toast container -->
      <div id="toast-container"></div>

      <div class="app-shell">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="app-logo">
              <span class="logo-glyph">⚙</span>
              <span class="logo-text">Maint<strong>Control</strong></span>
            </div>
            <button class="sidebar-toggle" onclick="App.toggleSidebar()">☰</button>
          </div>

          <nav class="sidebar-nav">
            ${Object.entries(routes).map(([key, r]) => `
              <a class="nav-item" data-route="${key}" onclick="App.navigate('${key}')">
                <span class="nav-icon">${r.icon}</span>
                <span class="nav-label">${r.label}</span>
                <span class="nav-badge" id="badge_${key}" style="display:none"></span>
              </a>
            `).join('')}
          </nav>

          <div class="sidebar-footer">
            <div class="user-chip">
              <div class="user-avatar" style="background:${roleColor}33;border-color:${roleColor}">${user.name[0]}</div>
              <div class="user-info">
                <strong>${user.name}</strong>
                <span style="color:${roleColor}">${AuthService.getRoleLabel(user.role)}</span>
              </div>
            </div>
            <div id="connStatus" class="conn-status"></div>
            <button class="btn btn-ghost btn-sm btn-full" onclick="App.logout()">← Salir</button>
          </div>
        </aside>

        <!-- Main content -->
        <main class="main-content">
          <div class="content-area" id="contentArea"></div>
        </main>
      </div>
    `;

    NotificationService.init();
    setupPWAInstall();
    updateConnStatus();
    updateNavBadges();
    navigate('dashboard');

    // Live duration update
    liveUpdateTimer = setInterval(() => {
      document.querySelectorAll('.live-dur').forEach(el => {
        const start = new Date(el.dataset.start);
        const elapsed = Math.round((new Date() - start) / 60000);
        el.textContent = `${Math.floor(elapsed/60)}h ${elapsed%60}m ⏳`;
      });
    }, 60000);
  }

  function navigate(route, param = null) {
    const routeDef = routes[route];
    if (!routeDef) return;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      document.getElementById('sidebar')?.classList.remove('open');
    }

    const content = document.getElementById('contentArea');
    if (!content) return;

    // Destroy previous module
    if (currentModule && window[currentModule]?.destroy) {
      window[currentModule].destroy();
    }

    currentModule = routeDef.module;

    if (route === 'profile') {
      renderProfile(content);
      return;
    }

    if (routeDef.module && window[routeDef.module]) {
      window[routeDef.module].render(content, param);
    }

    window.location.hash = route;
  }

  function renderProfile(container) {
    const user = AuthService.getUser();
    const roleColor = AuthService.getRoleColor(user.role);
    const areaNames = (user.areas||[]).map(aid => DataService.getById('areas', aid)?.name||aid).join(', ') || 'Todas';
    const myStops = DataService.getStopages({ responsibleId: user.id });

    container.innerHTML = `
      <div class="module-header"><h2><span class="icon">👤</span> Mi Perfil</h2></div>
      <div class="profile-grid">
        <div class="card profile-card">
          <div class="profile-avatar" style="background:${roleColor}22;border-color:${roleColor}">${user.name[0]}</div>
          <h3>${user.name}</h3>
          <span class="badge" style="background:${roleColor}22;color:${roleColor};border-color:${roleColor}44">${AuthService.getRoleLabel(user.role)}</span>
          <div class="profile-meta">
            <div><strong>Email:</strong> ${user.email}</div>
            <div><strong>Áreas:</strong> ${areaNames}</div>
            <div><strong>Paradas registradas:</strong> ${myStops.length}</div>
          </div>
        </div>
        <div class="card">
          <h3>Mis Permisos</h3>
          <div class="perms-grid">
            ${Object.keys(AuthService.PERMISSIONS).map(p => `
              <div class="perm-item ${AuthService.can(p) ? 'perm-yes' : 'perm-no'}">
                ${AuthService.can(p) ? '✅' : '❌'} ${p}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
  }

  function logout() {
    if (currentModule && window[currentModule]?.destroy) window[currentModule].destroy();
    if (liveUpdateTimer) clearInterval(liveUpdateTimer);
    NotificationService.stopPolling();
    AuthService.logout();
    renderLogin();
  }

  function updateConnStatus() {
    const el = document.getElementById('connStatus');
    if (!el) return;
    const online = navigator.onLine;
    const queue = DataService.getAll('offlineQueue');
    el.innerHTML = online
      ? `<span class="status-dot online"></span> Online`
      : `<span class="status-dot offline"></span> Offline (${queue.length} pendientes)`;
  }

  function updateNavBadges() {
    const active = DataService.getAll('stopages').filter(s => s.status === 'en_proceso').length;
    const badge = document.getElementById('badge_stopages');
    if (badge) {
      badge.textContent = active;
      badge.style.display = active > 0 ? 'inline-flex' : 'none';
    }
  }

  // ─── PWA Install ────────────────────────────────────────────────────────
  function setupPWAInstall() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'flex';
      const btn = document.getElementById('installBtn');
      if (btn) btn.addEventListener('click', async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          banner.style.display = 'none';
          NotificationService.showToast('¡Instalación exitosa! 🎉', 'MaintControl está en tu dispositivo', 'success');
        }
        deferredPrompt = null;
      });
    });
  }

  return { init, navigate, toggleSidebar, logout, demoLogin };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
