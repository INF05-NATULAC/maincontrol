import { useState, useEffect } from 'react'
import { machinesAPI, areasAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, Check, Cpu, Search } from 'lucide-react'

function MachineModal({ machine, areas, onSave, onClose }) {
  const [subareas, setSubareas] = useState([])
  const [form, setForm] = useState({
    code: machine?.code || '',
    name: machine?.name || '',
    description: machine?.description || '',
    subarea_id: machine?.subarea_id || '',
    brand: machine?.brand || '',
    model: machine?.model || '',
    serial_number: machine?.serial_number || '',
  })
  const [selectedArea, setSelectedArea] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedArea) {
      const { areasAPI } = require('../../services/api')
      areasAPI.listSubareas(selectedArea).then(r => setSubareas(r.data)).catch(() => {})
    }
  }, [selectedArea])

  // Load subareas for existing machine
  useEffect(() => {
    if (machine?.subarea_id) {
      // Find the area from the subarea - we need to get it from areas
      areas.forEach(async area => {
        const { areasAPI } = await import('../../services/api')
        const res = await areasAPI.listSubareas(area.id)
        if (res.data.find(s => s.id === machine.subarea_id)) {
          setSelectedArea(String(area.id))
          setSubareas(res.data)
        }
      })
    }
  }, [machine, areas])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, subarea_id: parseInt(form.subarea_id) }
      if (machine) {
        await machinesAPI.update(machine.id, payload)
        toast.success('Máquina actualizada')
      } else {
        await machinesAPI.create(payload)
        toast.success('Máquina creada')
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
            {machine ? 'Editar máquina' : 'Nueva máquina'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código *</label>
              <input className="input font-mono" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                required placeholder="L1-001" disabled={!!machine} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nombre *</label>
              <input className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                placeholder="Torno CNC Alpha" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Área</label>
              <select className="select" value={selectedArea}
                onChange={e => { setSelectedArea(e.target.value); setForm(f => ({ ...f, subarea_id: '' })) }}>
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subárea *</label>
              <select className="select" value={form.subarea_id}
                onChange={e => setForm(f => ({ ...f, subarea_id: e.target.value }))}
                required disabled={!selectedArea}>
                <option value="">Seleccionar subárea...</option>
                {subareas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Marca</label>
              <input className="input" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="HAAS" />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input className="input" value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="ST-10" />
            </div>
            <div>
              <label className="label">No. Serie</label>
              <input className="input font-mono" value={form.serial_number}
                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea className="input resize-none" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción de la máquina..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : <><Check size={13} /> {machine ? 'Actualizar' : 'Crear máquina'}</>}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMachine, setEditMachine] = useState(null)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, aRes] = await Promise.all([machinesAPI.list(), areasAPI.list()])
      setMachines(mRes.data)
      setAreas(aRes.data)
    } catch { toast.error('Error al cargar datos') } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const deactivate = async (m) => {
    if (!confirm(`¿Desactivar la máquina "${m.name}"?`)) return
    try {
      await machinesAPI.delete(m.id)
      toast.success('Máquina desactivada')
      loadData()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const filtered = machines.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    (m.brand || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Gestión de Máquinas</h1>
          <p className="page-subtitle">{machines.length} máquinas registradas</p>
        </div>
        <button onClick={() => { setEditMachine(null); setShowModal(true) }} className="btn-primary">
          <Plus size={14} /> Nueva máquina
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input className="input pl-8" placeholder="Buscar por código, nombre o marca..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Subárea</th>
                  <th>Marca / Modelo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className="font-mono text-xs px-2 py-1 rounded"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                        {m.code}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(59,130,246,0.1)' }}>
                          <Cpu size={11} className="text-blue-400" />
                        </div>
                        <span className="text-white text-sm">{m.name}</span>
                      </div>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ID: {m.subarea_id}
                    </td>
                    <td className="text-xs">
                      {m.brand || '—'}{m.model ? ` · ${m.model}` : ''}
                    </td>
                    <td>
                      <span className={m.is_active ? 'badge-done' : 'badge'}
                        style={!m.is_active ? { background: 'rgba(107,114,128,0.1)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.2)' } : {}}>
                        {m.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditMachine(m); setShowModal(true) }}
                          className="p-1.5 rounded hover:bg-blue-500/10" style={{ color: 'var(--text-muted)' }}>
                          <Edit2 size={13} />
                        </button>
                        {m.is_active && (
                          <button onClick={() => deactivate(m)}
                            className="p-1.5 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {search ? 'No se encontraron máquinas' : 'No hay máquinas registradas'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <MachineModal machine={editMachine} areas={areas}
          onSave={() => { setShowModal(false); loadData() }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
