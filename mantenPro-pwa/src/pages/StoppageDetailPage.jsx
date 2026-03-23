import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stoppagesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { ChevronLeft, Clock, CheckCircle, AlertTriangle, Edit2, Save, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: '#F59E0B' },
  { value: 'en_proceso', label: 'En proceso', color: '#3B82F6' },
  { value: 'finalizado', label: 'Finalizado', color: '#10B981' },
]

const TYPE_LABELS = {
  mecanica: 'Mecánica', electrica: 'Eléctrica',
  operacional: 'Operacional', calidad: 'Calidad', otro: 'Otro'
}

function StatusBadge({ status }) {
  const cls = status === 'pendiente' ? 'badge-pending'
    : status === 'en_proceso' ? 'badge-inprocess' : 'badge-done'
  const labels = { pendiente: 'Pendiente', en_proceso: 'En proceso', finalizado: 'Finalizado' }
  return <span className={cls}>{labels[status] || status}</span>
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="py-2.5 flex items-start justify-between gap-4"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

export default function StoppageDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canUpdateStatus, isAdmin, canEditTimes, user } = useAuthStore()

  const [stoppage, setStoppage] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editData, setEditData] = useState({
    status: '', resolution_notes: '', status_notes: '', end_time: ''
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [stopRes, histRes] = await Promise.all([
        stoppagesAPI.get(id),
        stoppagesAPI.getHistory(id)
      ])
      setStoppage(stopRes.data)
      setHistory(histRes.data)
      setEditData({
        status: stopRes.data.status,
        resolution_notes: stopRes.data.resolution_notes || '',
        status_notes: '',
        end_time: stopRes.data.end_time
          ? format(parseISO(stopRes.data.end_time), "yyyy-MM-dd'T'HH:mm")
          : ''
      })
    } catch {
      toast.error('Error al cargar la parada')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        status: editData.status,
        resolution_notes: editData.resolution_notes || undefined,
        status_notes: editData.status_notes || undefined,
        end_time: editData.end_time ? new Date(editData.end_time).toISOString() : undefined,
      }
      await stoppagesAPI.update(id, payload)
      toast.success('Parada actualizada')
      setEditing(false)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
      <span className="text-sm">Cargando...</span>
    </div>
  )

  if (!stoppage) return null

  const elapsed = stoppage.end_time ? null
    : differenceInMinutes(new Date(), parseISO(stoppage.start_time))

  const statusColor = STATUS_OPTIONS.find(s => s.value === stoppage.status)?.color || '#6B7280'

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/paradas')} className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-white">{stoppage.folio}</h1>
              <StatusBadge status={stoppage.status} />
              {stoppage.is_prolonged_alert && <span className="alert-prolonged">⚠ Prolongada</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Registrada {format(parseISO(stoppage.created_at), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        {canUpdateStatus() && !editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary">
            <Edit2 size={13} /> Editar estado
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Información de la parada</h3>
            </div>

            <InfoRow label="Área" value={stoppage.area?.name} />
            <InfoRow label="Máquina" value={`${stoppage.machine?.name} (${stoppage.machine?.code})`} />
            <InfoRow label="Tipo de falla" value={TYPE_LABELS[stoppage.stoppage_type]} />
            <InfoRow label="Motivo" value={stoppage.custom_reason || stoppage.reason?.name} />
            <InfoRow label="Descripción" value={stoppage.description} />
            <InfoRow label="Reportado por" value={stoppage.reporter?.full_name} />

            {stoppage.resolution_notes && (
              <InfoRow label="Notas de resolución" value={stoppage.resolution_notes} />
            )}
          </div>

          {/* Edit form */}
          {editing && (
            <div className="card p-5 animate-fade-in"
              style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
              <h3 className="text-sm font-medium text-white mb-4">Actualizar estado</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Nuevo estado</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} type="button"
                        onClick={() => setEditData(d => ({ ...d, status: s.value }))}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: editData.status === s.value ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${editData.status === s.value ? s.color + '50' : 'var(--border)'}`,
                          color: editData.status === s.value ? s.color : 'var(--text-secondary)'
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {canEditTimes() && (
                  <div>
                    <label className="label">Hora de finalización</label>
                    <input type="datetime-local" className="input"
                      value={editData.end_time}
                      onChange={e => setEditData(d => ({ ...d, end_time: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className="label">Notas de cambio de estado</label>
                  <input className="input" placeholder="¿Por qué se actualiza este estado?"
                    value={editData.status_notes}
                    onChange={e => setEditData(d => ({ ...d, status_notes: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Notas de resolución</label>
                  <textarea className="input resize-none" rows={2}
                    placeholder="Describe cómo se resolvió la falla..."
                    value={editData.resolution_notes}
                    onChange={e => setEditData(d => ({ ...d, resolution_notes: e.target.value }))} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? 'Guardando...' : <><Save size={13} /> Guardar cambios</>}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary">
                    <X size={13} /> Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status history */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-white mb-4">Historial de estados</h3>
            {history.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin historial</p>
            ) : (
              <div className="space-y-0">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background: STATUS_OPTIONS.find(s => s.value === h.new_status)?.color || '#6B7280'
                        }} />
                      {i < history.length - 1 && (
                        <div className="w-0.5 flex-1 mt-1" style={{ background: 'var(--border)', minHeight: 24 }} />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-white">
                          {h.previous_status ? (
                            <>{STATUS_OPTIONS.find(s => s.value === h.previous_status)?.label || h.previous_status} → </>
                          ) : 'Creación → '}
                          {STATUS_OPTIONS.find(s => s.value === h.new_status)?.label || h.new_status}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          por {h.changed_by?.full_name}
                        </span>
                      </div>
                      {h.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{h.notes}</p>}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {format(parseISO(h.changed_at), "dd/MM/yy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Time metrics */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Clock size={13} style={{ color: 'var(--text-muted)' }} /> Métricas de tiempo
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Inicio</p>
                <p className="font-mono text-sm text-white">
                  {format(parseISO(stoppage.start_time), 'dd/MM/yy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Fin</p>
                <p className="font-mono text-sm text-white">
                  {stoppage.end_time ? format(parseISO(stoppage.end_time), 'dd/MM/yy HH:mm') : '—'}
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {stoppage.duration_minutes ? 'Duración total' : 'Tiempo transcurrido'}
                </p>
                {stoppage.duration_minutes ? (
                  <p className="font-display text-2xl font-bold" style={{ color: statusColor }}>
                    {stoppage.duration_minutes >= 60
                      ? `${(stoppage.duration_minutes / 60).toFixed(1)}h`
                      : `${Math.round(stoppage.duration_minutes)}m`}
                  </p>
                ) : elapsed !== null ? (
                  <div>
                    <p className={`font-display text-2xl font-bold ${elapsed > 60 ? 'text-red-400' : 'text-amber-400'}`}>
                      {elapsed >= 60 ? `${(elapsed / 60).toFixed(1)}h` : `${elapsed}m`}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>En curso</p>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>—</p>}
              </div>
            </div>
          </div>

          {/* Status visual */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-white mb-3">Estado actual</h3>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map(s => (
                <div key={s.value} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{
                    background: stoppage.status === s.value ? `${s.color}12` : 'transparent',
                    border: `1px solid ${stoppage.status === s.value ? s.color + '40' : 'transparent'}`
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: stoppage.status === s.value ? s.color : 'var(--text-muted)' }} />
                  <span className="text-sm" style={{
                    color: stoppage.status === s.value ? s.color : 'var(--text-muted)',
                    fontWeight: stoppage.status === s.value ? 600 : 400
                  }}>{s.label}</span>
                  {stoppage.status === s.value && (
                    <CheckCircle size={12} className="ml-auto flex-shrink-0" style={{ color: s.color }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
