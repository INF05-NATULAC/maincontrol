import { useState, useEffect } from 'react'
import { areasAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Cpu, X, Check } from 'lucide-react'

function ColorPicker({ value, onChange }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']
  return (
    <div className="flex gap-1.5 flex-wrap">
      {colors.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
          style={{
            background: c,
            border: value === c ? '2px solid white' : '2px solid transparent',
            boxShadow: value === c ? `0 0 0 1px ${c}` : 'none'
          }} />
      ))}
    </div>
  )
}

function AreaForm({ area, onSave, onCancel }) {
  const [name, setName] = useState(area?.name || '')
  const [description, setDescription] = useState(area?.description || '')
  const [color, setColor] = useState(area?.color || '#3B82F6')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (area) {
        await areasAPI.update(area.id, { name, description, color })
        toast.success('Área actualizada')
      } else {
        await areasAPI.create({ name, description, color })
        toast.success('Área creada')
      }
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 animate-fade-in"
      style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Nombre del área *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required
            placeholder="ej. Producción" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Descripción breve..." />
        </div>
      </div>
      <div className="mb-4">
        <label className="label">Color identificador</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          <Check size={13} />{loading ? 'Guardando...' : (area ? 'Actualizar' : 'Crear área')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          <X size={13} /> Cancelar
        </button>
      </div>
    </form>
  )
}

function SubAreaForm({ areaId, subarea, onSave, onCancel }) {
  const [name, setName] = useState(subarea?.name || '')
  const [description, setDescription] = useState(subarea?.description || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (subarea) {
        await areasAPI.updateSubarea(subarea.id, { name, description })
        toast.success('Subárea actualizada')
      } else {
        await areasAPI.createSubarea(areaId, { name, description, area_id: areaId })
        toast.success('Subárea creada')
      }
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input className="input flex-1" value={name} onChange={e => setName(e.target.value)}
        required placeholder="Nombre de subárea" autoFocus />
      <input className="input w-48" value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Descripción" />
      <button type="submit" disabled={loading} className="btn-primary px-3 py-2">
        <Check size={13} />
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary px-3 py-2">
        <X size={13} />
      </button>
    </form>
  )
}

export default function AdminAreasPage() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewArea, setShowNewArea] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [expandedAreas, setExpandedAreas] = useState({})
  const [newSubareaFor, setNewSubareaFor] = useState(null)
  const [editingSubarea, setEditingSubarea] = useState(null)

  const loadAreas = async () => {
    try {
      const res = await areasAPI.list()
      setAreas(res.data)
    } catch { toast.error('Error al cargar áreas') } finally { setLoading(false) }
  }

  useEffect(() => { loadAreas() }, [])

  const toggleExpand = (id) => setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }))

  const deleteArea = async (area) => {
    if (!confirm(`¿Eliminar el área "${area.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await areasAPI.delete(area.id)
      toast.success('Área eliminada')
      loadAreas()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const deleteSubarea = async (subarea) => {
    if (!confirm(`¿Eliminar la subárea "${subarea.name}"?`)) return
    try {
      await areasAPI.deleteSubarea(subarea.id)
      toast.success('Subárea eliminada')
      loadAreas()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Áreas y Subáreas</h1>
          <p className="page-subtitle">Solo el Super Administrador puede gestionar la estructura</p>
        </div>
        <button onClick={() => setShowNewArea(true)} className="btn-primary">
          <Plus size={14} /> Nueva Área
        </button>
      </div>

      {showNewArea && (
        <AreaForm onSave={() => { setShowNewArea(false); loadAreas() }} onCancel={() => setShowNewArea(false)} />
      )}

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <div className="space-y-3">
          {areas.map(area => (
            <div key={area.id} className="card overflow-hidden">
              {/* Area header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: area.color }} />
                <button onClick={() => toggleExpand(area.id)} className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-medium text-white">{area.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                    {area.subareas?.length || 0} subáreas
                  </span>
                  {expandedAreas[area.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {area.description && (
                  <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                    {area.description}
                  </span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditingArea(area)} className="p-1.5 rounded hover:bg-blue-500/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteArea(area)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Edit area form */}
              {editingArea?.id === area.id && (
                <div className="px-4 pb-4">
                  <AreaForm area={area}
                    onSave={() => { setEditingArea(null); loadAreas() }}
                    onCancel={() => setEditingArea(null)} />
                </div>
              )}

              {/* Subareas */}
              {expandedAreas[area.id] && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="pt-3 space-y-1.5">
                    {area.subareas?.map(sub => (
                      <div key={sub.id}>
                        {editingSubarea?.id === sub.id ? (
                          <SubAreaForm areaId={area.id} subarea={sub}
                            onSave={() => { setEditingSubarea(null); loadAreas() }}
                            onCancel={() => setEditingSubarea(null)} />
                        ) : (
                          <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <Cpu size={12} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-sm text-white flex-1">{sub.name}</span>
                            {sub.machines_count > 0 && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {sub.machines_count} máq.
                              </span>
                            )}
                            <button onClick={() => setEditingSubarea(sub)}
                              className="p-1 rounded hover:bg-blue-500/10" style={{ color: 'var(--text-muted)' }}>
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => deleteSubarea(sub)}
                              className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {newSubareaFor === area.id ? (
                      <SubAreaForm areaId={area.id}
                        onSave={() => { setNewSubareaFor(null); loadAreas() }}
                        onCancel={() => setNewSubareaFor(null)} />
                    ) : (
                      <button onClick={() => setNewSubareaFor(area.id)}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-full mt-1 transition-colors"
                        style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                        <Plus size={11} /> Agregar subárea
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {areas.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No hay áreas configuradas. Crea la primera.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
