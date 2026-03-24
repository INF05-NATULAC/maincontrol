/**
 * MaintControl - Auth Service
 * Role-based access control system.
 * 
 * Roles hierarchy: superadmin > admin > gerente > jefe > supervisor > tecnico > operario > visualizador
 */

window.AuthService = (() => {
  const ROLE_HIERARCHY = {
    superadmin:  { level: 8, label: 'Super Administrador', color: '#ff6b35' },
    admin:       { level: 7, label: 'Administrador', color: '#a855f7' },
    gerente:     { level: 6, label: 'Gerente', color: '#3b82f6' },
    jefe:        { level: 5, label: 'Jefe de Área', color: '#06b6d4' },
    supervisor:  { level: 4, label: 'Supervisor', color: '#10b981' },
    tecnico:     { level: 3, label: 'Técnico', color: '#f59e0b' },
    operario:    { level: 2, label: 'Operario', color: '#6b7280' },
    visualizador:{ level: 1, label: 'Visualizador', color: '#9ca3af' },
  };

  const PERMISSIONS = {
    // Structure management
    manageAreas:       ['superadmin'],
    manageSubareas:    ['superadmin'],
    manageMachines:    ['superadmin','admin'],
    manageUsers:       ['superadmin','admin'],
    manageReasons:     ['superadmin','admin'],
    manageAlerts:      ['superadmin','admin','gerente'],

    // Stopages
    createStopage:     ['superadmin','admin','gerente','jefe','supervisor','tecnico','operario'],
    editStopage:       ['superadmin','admin','gerente','jefe','supervisor'],
    deleteStopage:     ['superadmin','admin','gerente'],
    editStartEndTime:  ['superadmin','admin','gerente','jefe','supervisor'],
    changeStatus:      ['superadmin','admin','gerente','jefe','supervisor','tecnico'],

    // Reports
    exportReports:     ['superadmin','admin','gerente','jefe','supervisor'],
    viewAllAreas:      ['superadmin','admin','gerente'],
    viewDashboard:     ['superadmin','admin','gerente','jefe','supervisor','tecnico'],
    viewReports:       ['superadmin','admin','gerente','jefe','supervisor'],
  };

  let currentUser = null;

  function init() {
    const stored = sessionStorage.getItem('mc_session');
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch {}
    }
  }

  function login(email, password) {
    const users = DataService.getAll('users');
    const user = users.find(u => u.email === email && u.password === password && u.active);
    if (!user) return { success: false, error: 'Credenciales inválidas' };

    const { password: _, ...safeUser } = user;
    currentUser = safeUser;
    sessionStorage.setItem('mc_session', JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem('mc_session');
  }

  function getUser() { return currentUser; }

  function isLoggedIn() { return !!currentUser; }

  function can(permission) {
    if (!currentUser) return false;
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(currentUser.role);
  }

  function canAccessArea(areaId) {
    if (!currentUser) return false;
    if (can('viewAllAreas')) return true;
    return currentUser.areas?.includes(areaId);
  }

  function getRoleLabel(role) {
    return ROLE_HIERARCHY[role]?.label || role;
  }

  function getRoleColor(role) {
    return ROLE_HIERARCHY[role]?.color || '#6b7280';
  }

  function getRoles() {
    return Object.entries(ROLE_HIERARCHY).map(([key, val]) => ({ key, ...val }));
  }

  function hasLevel(minRole) {
    if (!currentUser) return false;
    const userLevel = ROLE_HIERARCHY[currentUser.role]?.level || 0;
    const minLevel = ROLE_HIERARCHY[minRole]?.level || 0;
    return userLevel >= minLevel;
  }

  return { init, login, logout, getUser, isLoggedIn, can, canAccessArea, getRoleLabel, getRoleColor, getRoles, hasLevel, PERMISSIONS };
})();
