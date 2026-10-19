import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy } from 'react'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const History = lazy(() => import('./pages/History'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Streaks = lazy(() => import('./pages/Streaks'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))

function RequireAuth () {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <main
        className='grid min-h-screen place-items-center text-cream'
        role='status'
      >
        Preparing your workspace…
      </main>
    )
  if (!user)
    return <Navigate to='/login' state={{ from: location.pathname }} replace />
  return <AppLayout key={user.uid} />
}
export default function App () {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to='/dashboard' replace />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/history' element={<History />} />
        <Route path='/analytics' element={<Analytics />} />
        <Route path='/budgets' element={<Budgets />} />
        <Route path='/streaks' element={<Streaks />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/settings' element={<Settings />} />
      </Route>
      <Route path='*' element={<Navigate to='/dashboard' replace />} />
    </Routes>
  )
}
