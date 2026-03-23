import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, Zap, Shield, Activity } from 'lucide-react'

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.login(data)
      login(res.data.access_token, res.data.user)
      toast.success(`Bienvenido, ${res.data.user.full_name}`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Demo credential tiles
  const demoCredentials = [
    { label: 'Super Admin', user: 'superadmin', role: 'super_administrador', color: '#8B5CF6' },
    { label: 'Administrador', user: 'admin', role: 'administrador', color: '#EF4444' },
    { label: 'Supervisor', user: 'supervisor1', role: 'supervisor', color: '#3B82F6' },
    { label: 'Operador', user: 'operador1', role: 'operador', color: '#6B7280' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a0e1a 0%, #0d1929 60%, #0f1f35 100%)' }}>

        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)'
          }} />

        {/* Accent glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Zap size={18} className="text-blue-400" />
            </div>
            <span className="font-display text-xl font-bold tracking-widest text-white uppercase">MantenPro</span>
          </div>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Sistema de Gestión Industrial
          </p>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="font-display text-5xl font-bold leading-tight text-white mb-4">
              Control total<br />
              <span style={{ color: '#3B82F6' }}>en tiempo real</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed max-w-sm">
              Registra y monitorea paradas de máquinas, gestiona equipos y analiza indicadores de mantenimiento con precisión industrial.
            </p>
          </div>

          {/* Features */}
          {[
            { icon: Activity, text: 'Monitoreo en tiempo real con WebSockets' },
            { icon: Shield, text: 'Control de acceso por roles y áreas' },
            { icon: Zap, text: 'Dashboard con KPIs y reportes automatizados' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Icon size={14} className="text-blue-400" />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        <p className="relative text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2025 MantenPro · v1.0.0
        </p>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Zap size={20} className="text-blue-400" />
            <span className="font-display text-lg font-bold tracking-widest uppercase text-white">MantenPro</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mb-1">Iniciar sesión</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Usuario o Email</label>
              <input
                className={`input ${errors.username ? 'border-red-500' : ''}`}
                placeholder="usuario o correo@empresa.com"
                autoComplete="username"
                {...register('username', { required: 'Campo requerido' })}
              />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Campo requerido' })}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : 'Ingresar al sistema'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Credenciales de demo (contraseña: Admin123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoCredentials.map((cred) => (
                <button key={cred.user}
                  onClick={() => {
                    document.querySelector('[name="username"]').value = cred.user
                    // Trigger form change
                    handleSubmit((data) => onSubmit({ username: cred.user, password: 'Admin123!' }))()
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs transition-all"
                  style={{
                    background: `rgba(${cred.color === '#8B5CF6' ? '139,92,246' : cred.color === '#EF4444' ? '239,68,68' : cred.color === '#3B82F6' ? '59,130,246' : '107,114,128'},0.08)`,
                    border: `1px solid rgba(${cred.color === '#8B5CF6' ? '139,92,246' : cred.color === '#EF4444' ? '239,68,68' : cred.color === '#3B82F6' ? '59,130,246' : '107,114,128'},0.2)`,
                    color: cred.color
                  }}>
                  <div className="font-medium">{cred.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{cred.user}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
