import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token, user) => {
        set({ token, user, isAuthenticated: true })
        // Store token for axios
        localStorage.setItem('access_token', token)
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        localStorage.removeItem('access_token')
      },

      updateUser: (updates) => {
        set(state => ({ user: { ...state.user, ...updates } }))
      },

      // Role checks
      hasRole: (...roles) => {
        const { user } = get()
        return user && roles.includes(user.role)
      },

      canManageAreas: () => {
        const { user } = get()
        return user?.role === 'super_administrador'
      },

      canUpdateStatus: () => {
        const { user } = get()
        return user && ['supervisor', 'jefe', 'gerente', 'administrador', 'super_administrador'].includes(user.role)
      },

      canViewAllAreas: () => {
        const { user } = get()
        return user && ['gerente', 'administrador', 'super_administrador'].includes(user.role)
      },

      canManageUsers: () => {
        const { user } = get()
        return user && ['administrador', 'super_administrador'].includes(user.role)
      },

      isAdmin: () => {
        const { user } = get()
        return user && ['administrador', 'super_administrador'].includes(user.role)
      },

      canEditTimes: () => {
        const { user } = get()
        return user && ['supervisor', 'jefe', 'gerente', 'administrador', 'super_administrador'].includes(user.role)
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
)

// Role labels in Spanish
export const ROLE_LABELS = {
  operador: 'Operador',
  supervisor: 'Supervisor',
  jefe: 'Jefe',
  gerente: 'Gerente',
  administrador: 'Administrador',
  super_administrador: 'Super Administrador'
}

export const ROLE_COLORS = {
  operador: '#6B7280',
  supervisor: '#3B82F6',
  jefe: '#F59E0B',
  gerente: '#10B981',
  administrador: '#EF4444',
  super_administrador: '#8B5CF6'
}
