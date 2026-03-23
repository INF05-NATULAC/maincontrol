import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export function useWebSocket(onMessage) {
  const { token, user } = useAuthStore()
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return

    const areaParam = user?.area_id ? `&area_id=${user.area_id}` : ''
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws?token=${token}${areaParam}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (mountedRef.current) {
          setConnected(true)
          console.log('WebSocket connected')
        }
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.type !== 'heartbeat' && data.type !== 'pong') {
            onMessage?.(data)
          }
        } catch (e) { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        if (mountedRef.current) {
          setConnected(false)
          // Reconnect after 3 seconds
          reconnectTimer.current = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      // Send ping every 25 seconds
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25000)

      ws._pingInterval = pingInterval

    } catch (e) {
      console.error('WebSocket connection failed:', e)
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [token, user?.area_id, onMessage])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        clearInterval(wsRef.current._pingInterval)
        wsRef.current.close()
      }
    }
  }, [connect])

  return { connected }
}
