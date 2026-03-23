import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StoppagesPage from './pages/StoppagesPage'
import NewStoppagePage from './pages/NewStoppagePage'
import StoppageDetailPage from './pages/StoppageDetailPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminAreasPage from './pages/admin/AdminAreasPage'
import AdminMachinesPage from './pages/admin/AdminMachinesPage'

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />

      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="paradas" element={<StoppagesPage />} />
        <Route path="paradas/nueva" element={<NewStoppagePage />} />
        <Route path="paradas/:id" element={<StoppageDetailPage />} />

        {/* Admin routes */}
        <Route path="admin/usuarios" element={
          <ProtectedRoute roles={['administrador', 'super_administrador']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="admin/areas" element={
          <ProtectedRoute roles={['super_administrador']}>
            <AdminAreasPage />
          </ProtectedRoute>
        } />
        <Route path="admin/maquinas" element={
          <ProtectedRoute roles={['administrador', 'super_administrador']}>
            <AdminMachinesPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
