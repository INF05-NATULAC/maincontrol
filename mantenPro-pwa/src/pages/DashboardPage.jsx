import { useState, useEffect, useCallback } from 'react'
import { dashboardAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { AlertTriangle, Clock, CheckCircle, Activity, TrendingUp, Zap, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const STOP_TYPE_LABELS = {
  mecanica: 'Mecánica', electrica: 'Eléctrica',
  operacional: 'Operacional', calidad: 'Calidad', otro: 'Otro'
}
const TYPE_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6']

function StatCard({ icon: Icon, title, value, sub, color, trend }) {
  return (
    <div className="stat-card animate-fade-in">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <p className="text-3xl font-display font-bold" style={{ color }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-xs shadow-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}>
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-mono">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [byArea, setByArea] = useState([])
  const [byMachine, setByMachine] = useState([])
  const [byType, setByType] = useState([])
  const [timeSeries, setTimeSeries] = useState([])
  const [active, setActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, areaRes, machineRes, typeRes, tsRes, activeRes] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.byArea(),
        dashboardAPI.byMachine({ limit: 8 }),
        dashboardAPI.byType(),
        dashboardAPI.timeSeries({ days: 14 }),
        dashboardAPI.active(),
      ])
      setStats(statsRes.data)
      setByArea(areaRes.data)
      setByMachine(machineRes.data)
      setByType(Object.entries(typeRes.data).map(([name, value]) => ({
        name: STOP_TYPE_LABELS[name] || name, value
      })).filter(d => d.value > 0))
      setTimeSeries(tsRes.data.map(d => ({
        ...d,
        date: format(parseISO(d.date), 'dd/MM', { locale: es })
      })))
      setActive(activeRes.data)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Auto-refresh every 30 seconds
    const timer = setInterval(fetchAll, 30000)
    return () => clearInterval(timer)
  }, [fetchAll])

  // Real-time updates
  const handleWsMessage = useCallback((msg) => {
    if (['stoppage_created', 'stoppage_updated'].includes(msg.type)) {
      fetchAll()
    }
  }, [fetchAll])

  useWebSocket(handleWsMessage)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-sm">Cargando indicadores...</span>
      </div>
    </div>
  )

  const pieColors = ['#F59E0B', '#3B82F6', '#10B981']

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Panel de Control</h1>
          <p className="page-subtitle">
            Bienvenido, <span style={{ color: 'var(--text-primary)' }}>{user?.full_name}</span>
            {user?.area_id && <span> · Área asignada</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {format(lastUpdate, 'HH:mm:ss')}
          </span>
          <button onClick={fetchAll} className="btn-secondary px-3 py-1.5 text-xs">
            <RefreshCw size={12} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} title="Total Paradas" value={stats.total_stoppages}
            sub={`${stats.stoppages_today} hoy`} color="#3B82F6" />
          <StatCard icon={AlertTriangle} title="Pendientes" value={stats.pending}
            sub={`${stats.in_process} en proceso`} color="#F59E0B" />
          <StatCard icon={CheckCircle} title="Finalizadas" value={stats.finished}
            sub="completadas" color="#10B981" />
          <StatCard icon={Clock} title="Tiempo Perdido" value={`${stats.total_downtime_hours}h`}
            sub={`Promedio ${stats.avg_duration_minutes} min`} color="#8B5CF6" />
        </div>
      )}

      {/* Alert: Prolonged stoppages */}
      {stats?.prolonged_alerts > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm" style={{ color: '#FCA5A5' }}>
            <strong>{stats.prolonged_alerts} parada(s) prolongada(s)</strong> — Requieren atención inmediata
          </p>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Time series */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={14} style={{ color: '#3B82F6' }} />
            Paradas últimos 14 días
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2}
                dot={false} name="Paradas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart by type */}
        <div className="card p-5">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Por tipo de falla
          </h3>
          {byType.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin datos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* By area */}
        <div className="card p-5">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Paradas por área
          </h3>
          {byArea.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byArea} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="area_name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pending" name="Pendiente" fill="#F59E0B" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="in_process" name="En proceso" fill="#3B82F6" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="finished" name="Finalizado" fill="#10B981" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top machines */}
        <div className="card p-5">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Máquinas con más paradas
          </h3>
          <div className="space-y-2">
            {byMachine.slice(0, 6).map((m, i) => (
              <div key={m.machine_id} className="flex items-center gap-3">
                <span className="text-xs font-mono w-4 text-right flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-white truncate">{m.machine_name}</span>
                    <span className="text-xs font-mono ml-2 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {m.total_stoppages}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${(m.total_stoppages / (byMachine[0]?.total_stoppages || 1)) * 100}%`,
                        background: `hsl(${220 - i * 20}, 80%, 65%)`
                      }} />
                  </div>
                </div>
              </div>
            ))}
            {byMachine.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Active stoppages table */}
      {active.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="pulse-dot" />
              Paradas activas ({active.length})
            </h3>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Área</th>
                  <th>Máquina</th>
                  <th>Estado</th>
                  <th>Tiempo transcurrido</th>
                </tr>
              </thead>
              <tbody>
                {active.map(s => (
                  <tr key={s.id}>
                    <td><span className="font-mono text-xs text-white">{s.folio}</span></td>
                    <td>{s.area_name}</td>
                    <td><span className="text-white">{s.machine_name}</span></td>
                    <td>
                      <span className={s.status === 'pendiente' ? 'badge-pending' : 'badge-inprocess'}>
                        {s.status === 'pendiente' ? 'Pendiente' : 'En proceso'}
                      </span>
                    </td>
                    <td>
                      {s.is_prolonged
                        ? <span className="alert-prolonged">{s.elapsed_minutes} min ⚠</span>
                        : <span className="font-mono text-xs">{s.elapsed_minutes} min</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
