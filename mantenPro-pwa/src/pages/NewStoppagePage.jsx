import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { areasAPI, machinesAPI, stoppagesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { ChevronLeft, AlertTriangle, CheckCircle } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'electrica', label: 'Eléctrica' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'calidad', label: 'Calidad' },
  { value: 'otro', label: 'Otro' },
]

const COMMON_REASONS = [
  'Falla eléctrica', 'Rotura de rodamiento', 'Desgaste de herramienta',
  'Error de operador', 'Falta de material', 'Fuga hidráulica',
  'Sensor averiado', 'Mantenimiento preventivo', 'Otro (especificar)'
]

export default function NewStoppagePage() {
  const { user, canEditTimes } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [areas, setAreas] = useState([])
  const [subareas, setSubareas] = useState([])
  const [machines, setMachines] = useState([])
  const [success, setSuccess] = useState(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      area_id: user?.area_id || '',
      start_time: new Date().toISOString().slice(0, 16),
      stoppage_type: 'otro',
    }
  })

  const selectedArea = watch('area_id')
  const selectedSubarea = watch('subarea_id')

  useEffect(() => {
    areasAPI.list().then(r => setAreas(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedArea) {
      areasAPI.listSubareas(selectedArea).then(r => {
        setSubareas(r.data)
        setValue('subarea_id', '')
        setMachines([])
      }).catch(() => {})
    }
  }, [selectedArea, setValue])

  useEffect(() => {
    if (selectedSubarea) {
      machinesAPI.list({ subarea_id: selectedSubarea }).then(r => {
        setMachines(r.data)
        setValue('machine_id', '')
      }).catch(() => {})
    }
  }, [selectedSubarea, setValue])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const payload = {
        area_id: parseInt(data.area_id),
        subarea_id: parseInt(data.subarea_id),
        machine_id: parseInt(data.machine_id),
        stoppage_type: data.stoppage_type,
        description: data.description,
        custom_reason: data.custom_reason,
        start_time: data.start_time ? new Date(data.start_time).toISOString() : undefined,
      }
      const res = await stoppagesAPI.create(payload)
      setSuccess(res.data)
      toast.success(`Parada registrada: ${res.data.folio}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al registrar la parada')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 animate-fade-in">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-1">¡Parada Registrada!</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            La parada ha sido registrada exitosamente
          </p>
          <div className="px-4 py-3 rounded-lg mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Folio</p>
            <p className="font-mono text-xl font-bold text-white">{success.folio}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/paradas/${success.id}`)} className="btn-primary flex-1">
              Ver detalle
            </button>
            <button onClick={() => { setSuccess(null) }} className="btn-secondary flex-1">
              Nueva parada
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/paradas')} className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className="page-title">Registrar Parada</h1>
          <p className="page-subtitle">Completa el formulario para registrar una nueva parada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Location section */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>1</span>
            Ubicación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Área *</label>
              <select className={`select ${errors.area_id ? 'border-red-500' : ''}`}
                {...register('area_id', { required: 'Seleccione un área' })}
                disabled={!!user?.area_id && user?.role === 'operador'}>
                <option value="">Seleccionar...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.area_id && <p className="text-red-400 text-xs mt-1">{errors.area_id.message}</p>}
            </div>
            <div>
              <label className="label">Subárea *</label>
              <select className={`select ${errors.subarea_id ? 'border-red-500' : ''}`}
                {...register('subarea_id', { required: 'Seleccione una subárea' })}
                disabled={!selectedArea}>
                <option value="">Seleccionar...</option>
                {subareas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.subarea_id && <p className="text-red-400 text-xs mt-1">{errors.subarea_id.message}</p>}
            </div>
            <div>
              <label className="label">Máquina *</label>
              <select className={`select ${errors.machine_id ? 'border-red-500' : ''}`}
                {...register('machine_id', { required: 'Seleccione una máquina' })}
                disabled={!selectedSubarea}>
                <option value="">Seleccionar...</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
              </select>
              {errors.machine_id && <p className="text-red-400 text-xs mt-1">{errors.machine_id.message}</p>}
            </div>
          </div>
        </div>

        {/* Details section */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>2</span>
            Detalle de la parada
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de falla *</label>
              <select className="select" {...register('stoppage_type', { required: true })}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Motivo</label>
              <select className="select" onChange={e => {
                if (e.target.value !== 'custom') setValue('custom_reason', e.target.value)
              }}>
                <option value="">Seleccionar motivo...</option>
                {COMMON_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción / Motivo personalizado</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Describe brevemente la causa de la parada..."
                {...register('custom_reason')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observaciones adicionales</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Información adicional relevante..."
                {...register('description')} />
            </div>
          </div>
        </div>

        {/* Timing section */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>3</span>
            Tiempo
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            La fecha y hora de inicio se captura automáticamente
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Inicio de parada</label>
              <input type="datetime-local" className="input"
                {...register('start_time')}
                disabled={user?.role === 'operador'} />
              {user?.role === 'operador' && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Capturado automáticamente
                </p>
              )}
            </div>
            <div className="flex items-end pb-1">
              <div className="w-full px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Reportado por</p>
                <p className="text-white font-medium mt-0.5">{user?.full_name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>No editable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/paradas')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registrando...
              </span>
            ) : (
              <><AlertTriangle size={14} /> Registrar Parada</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
