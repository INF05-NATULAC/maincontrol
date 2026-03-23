import { useState, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, ROLE_LABELS, ROLE_COLORS } from '../../store/authStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, AlertTriangle, Plus, Users, Settings2,
  Cpu, ChevronLeft, ChevronRight, LogOut, Bell, Zap,
  Wifi, WifiOff, Menu, X, Map
} from 'lucide-react'
import NotificationPanel from './NotificationPanel'

export default function Layout() {
  const { user, logout, canManageUsers, canManageAreas, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'stoppage_created') {
      toast((t) => (
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Nueva parada registrada</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {msg.data?.machine?.name} — {msg.data?.area?.name}
            </p>
          </div>
        </div>
      ), { duration: 5000 })
      setUnreadCount(c => c + 1)
    } else if (msg.type === 'stoppage_alert') {
      toast.error(`⚠ Parada prolongada: ${msg.data?.folio}`, { duration: 8000 })
    }
  }, [])

  const { connected } = useWebSocket(handleWsMessage)

  const handleLogout = async () => {
    logout()
    navigate('/login')
    toast.success('Sesión cerrada')
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/paradas', icon: AlertTriangle, label: 'Paradas' },
    { to: '/paradas/nueva', icon: Plus, label: 'Nueva Parada' },
  ]

  const adminItems = [
    ...(canManageAreas() ? [{ to: '/admin/areas', icon: Map, label: 'Áreas y Subáreas' }] : []),
    ...(canManageUsers() ? [{ to: '/admin/usuarios', icon: Users, label: 'Usuarios' }] : []),
    ...(isAdmin() ? [{ to: '/admin/maquinas', icon: Cpu, label: 'Máquinas' }] : []),
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 mb-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <Zap size={16} className="text-blue-400" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-base tracking-widest text-white uppercase">MantenPro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
            onClick={() => setMobileOpen(false)}>
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {adminItems.length > 0 && (
          <>
            <div className={`pt-4 pb-1 px-3 ${collapsed ? 'hidden' : ''}`}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Administración
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                onClick={() => setMobileOpen(false)}>
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: user?.avatar_color || '#6366F1' }}>
              {user?.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs truncate" style={{
                color: ROLE_COLORS[user?.role] || 'var(--text-muted)',
                fontSize: '10px'
              }}>
                {ROLE_LABELS[user?.role]}
              </p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--text-muted)' }} title="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button onClick={handleLogout} className="p-2 rounded-md transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--text-muted)' }}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-14' : 'w-56'}`}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 bottom-20 translate-x-full -mr-3 w-5 h-10 rounded-r flex items-center justify-center transition-colors"
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderLeft: 'none', color: 'var(--text-muted)'
          }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full z-50"
            style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 h-14 flex-shrink-0"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button className="lg:hidden p-2 rounded-md" style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* WS Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              {connected
                ? <><Wifi size={12} className="text-emerald-400" /><span style={{ color: 'var(--text-muted)' }}>En línea</span></>
                : <><WifiOff size={12} className="text-red-400" /><span className="text-red-400">Desconectado</span></>
              }
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0) }}
                className="p-2 rounded-md relative transition-colors"
                style={{ color: 'var(--text-secondary)', background: showNotifications ? 'rgba(255,255,255,0.06)' : '' }}>
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#EF4444' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
