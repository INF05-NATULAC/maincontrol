import { useEffect, useState } from 'react'
import { notificationsAPI } from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Check, AlertTriangle, Info, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.list()
      setNotifications(res.data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleClick = async (notif) => {
    if (!notif.is_read) {
      await notificationsAPI.markRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    if (notif.related_stoppage_id) {
      navigate(`/paradas/${notif.related_stoppage_id}`)
      onClose()
    }
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="absolute right-0 top-10 w-80 z-50 shadow-2xl rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium text-white">Notificaciones</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: '#EF4444' }}>{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={markAllRead} className="p-1 rounded text-xs"
              style={{ color: 'var(--text-muted)' }} title="Marcar todas como leídas">
              <Check size={13} />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded"
            style={{ color: 'var(--text-muted)' }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell size={24} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin notificaciones</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} onClick={() => handleClick(notif)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: notif.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
                borderBottom: '1px solid var(--border)'
              }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: notif.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)'
                }}>
                {notif.type === 'warning'
                  ? <AlertTriangle size={12} className="text-amber-400" />
                  : <Info size={12} className="text-blue-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{notif.title}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {notif.message}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              {!notif.is_read && (
                <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                  style={{ background: '#3B82F6' }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
