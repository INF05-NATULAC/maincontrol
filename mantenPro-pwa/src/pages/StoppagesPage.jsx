import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { stoppagesAPI, areasAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, RefreshCw, FileDown, Eye,
  ChevronLeft, ChevronRight, AlertTriangle, Clock
} from 'lucide-react'

const STATUS_LABELS = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', finalizado: 'Finalizado'
}
const TYPE_LABELS = {
  mecanica: 'Mecánica', electrica: 'Eléctrica',
  operacional: 'Operacional', calidad: 'Calidad', otro: 'Otro'
}

function StatusBadge({ status }) {
  const cls = status === 'pendiente' ? 'badge-pending'
    : status === 'en_proceso' ? 'badge-inprocess'
    : 'badge-done'
  return <span className={cls}>{STATUS_LABELS[status] || status}</span>
}

export default function StoppagesPage() {
  const { user, canUpdateStatus } = useAuthStore()
  const navigate = useNavigate()

  const [stoppages, setStoppages] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [filters, setFilters] = useState({
    area_id: '', subarea_id: '', status_filter: '',
    stoppage_type: '', date_from: '', date_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchStoppages = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: 20 }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await stoppagesAPI.list(params)
      setStoppages(res.data.items)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (e) {
      toast.error('Error al cargar paradas')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchStoppages()
    areasAPI.list().then(r => setAreas(r.data)).catch(() => {})
  }, [fetchStoppages])

  const clearFilters = () => {
    setFilters({ area_id: '', subarea_id: '', status_filter: '', stoppage_type: '', date_from: '', date_to: '' })
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Registro de Paradas</h1>
          <p className="page-subtitle">{total} registros encontrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${hasFilters ? 'border-blue-500/40 text-blue-400' : ''}`}>
            <Filter size={14} />
            Filtros {hasFilters && `(activos)`}
          </button>
          <button onClick={fetchStoppages} className="btn-secondary">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => navigate('/paradas/nueva')} className="btn-primary">
            <Plus size={14} />
            Nueva Parada
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="label">Área</label>
              <select className="select" value={filters.area_id}
                onChange={e => setFilters(f => ({ ...f, area_id: e.target.value, subarea_id: '' }))}>
                <option value="">Todas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="select" value={filters.status_filter}
                onChange={e => setFilters(f => ({ ...f, status_filter: e.target.value }))}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de Falla</label>
              <select className="select" value={filters.stoppage_type}
                onChange={e => setFilters(f => ({ ...f, stoppage_type: e.target.value }))}>
                <option value="">Todos</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha desde</label>
              <input type="datetime-local" className="input text-xs" value={filters.date_from}
                onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha hasta</label>
              <input type="datetime-local" className="input text-xs" value={filters.date_to}
                onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="btn-secondary w-full">
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3"
            style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Cargando registros...</span>
          </div>
        ) : stoppages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No se encontraron paradas</p>
            <button onClick={() => navigate('/paradas/nueva')} className="btn-primary mt-2">
              <Plus size={14} /> Registrar primera parada
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Área / Máquina</th>
                    <th>Inicio</th>
                    <th>Duración</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Reportado por</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stoppages.map(s => (
                    <tr key={s.id} className="cursor-pointer"
                      onClick={() => navigate(`/paradas/${s.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white">{s.folio}</span>
                          {s.is_prolonged_alert && (
                            <span className="alert-prolonged">⚠</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-white text-xs font-medium">{s.machine?.name || '—'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {s.area?.name || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="text-xs">
                        {format(parseISO(s.start_time), 'dd/MM/yy HH:mm', { locale: es })}
                      </td>
                      <td>
                        {s.duration_minutes ? (
                          <div className="flex items-center gap-1">
                            <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                            <span className="font-mono text-xs">
                              {s.duration_minutes >= 60
                                ? `${(s.duration_minutes / 60).toFixed(1)}h`
                                : `${Math.round(s.duration_minutes)}m`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>En curso</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          {TYPE_LABELS[s.stoppage_type] || s.stoppage_type}
                        </span>
                      </td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {s.reporter?.full_name || '—'}
                        </p>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/paradas/${s.id}`)}
                          className="p-1.5 rounded-md transition-colors hover:bg-blue-500/10"
                          style={{ color: 'var(--text-muted)' }}>
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Página {page} de {pages} · {total} registros
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn-secondary px-2 py-1.5">
                    <ChevronLeft size={13} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    className="btn-secondary px-2 py-1.5">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
