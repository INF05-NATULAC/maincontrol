import { useState, useEffect } from 'react'
import { usersAPI, areasAPI } from '../../services/api'
import { useAuthStore, ROLE_LABELS, ROLE_COLORS } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, Check, Shield } from 'lucide-react'

const ROLES = ['operador', 'supervisor', 'jefe', 'gerente', 'administrador', 'super_administrador']

function UserModal({ user, areas, onSave, onClose }) {
  const { user: currentUser } = useAuthStore()
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    password: '',
    role: user?.role || 'operador',
    area_id: user?.area_id || '',
    is_active: user?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)

  const availableRoles = ROLES.filter(r =>
    currentUser?.role === 'super_administrador' ? true : r !== 'super_administrador'
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, area_id: form.area_id ? parseInt(form.area_id) : null }
      if (!payload.password) delete payload.password
      if (user) {
        await usersAPI.update(user.id, payload)
        toast.success('Usuario actualizado')
      } else {
        await usersAPI.create(payload)
        toast.success('Usuario creado')
      }
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-xl font-bold text-white">
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre completo *</label>
              <input className="input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Usuario *</label>
              <input className="input" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required disabled={!!user} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">{user ? 'Nueva contraseña' : 'Contraseña *'}</label>
              <input type="password" className="input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!user} placeholder={user ? 'Dejar vacío para no cambiar' : ''} />
            </div>
            <div>
              <label className="label">Rol *</label>
              <select className="select" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Área asignada</label>
              <select className="select" value={form.area_id}
                onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}>
                <option value="">Sin área</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Usuario activo
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : <><Check size={13} /> {user ? 'Actualizar' : 'Crear usuario'}</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, areasRes] = await Promise.all([usersAPI.list(), areasAPI.list()])
      setUsers(usersRes.data)
      setAreas(areasRes.data)
    } catch { toast.error('Error al cargar datos') } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const deactivate = async (u) => {
    if (!confirm(`¿Desactivar al usuario "${u.full_name}"?`)) return
    try {
      await usersAPI.delete(u.id)
      toast.success('Usuario desactivado')
      loadData()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true) }} className="btn-primary">
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Área</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: u.avatar_color || '#6366F1' }}>
                          {u.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.full_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{
                          background: `${ROLE_COLORS[u.role]}18`,
                          color: ROLE_COLORS[u.role],
                          border: `1px solid ${ROLE_COLORS[u.role]}30`
                        }}>
                        <Shield size={10} className="inline mr-1" />
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="text-xs">
                      {areas.find(a => a.id === u.area_id)?.name || '—'}
                    </td>
                    <td>
                      <span className={u.is_active ? 'badge-done' : 'badge'} style={!u.is_active ? { background: 'rgba(107,114,128,0.1)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.2)' } : {}}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('es') : 'Nunca'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditUser(u); setShowModal(true) }}
                          className="p-1.5 rounded hover:bg-blue-500/10" style={{ color: 'var(--text-muted)' }}>
                          <Edit2 size={13} />
                        </button>
                        {u.is_active && (
                          <button onClick={() => deactivate(u)}
                            className="p-1.5 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal user={editUser} areas={areas}
          onSave={() => { setShowModal(false); loadData() }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
