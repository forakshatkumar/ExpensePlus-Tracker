import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Budgets from './pages/Budgets';
import Streaks from './pages/Streaks';
import Profile from './pages/Profile';

function RequireAuth() {
  const {user, loading} = useAuth();
  const location = useLocation();
  if (loading) return <main className="grid min-h-screen place-items-center text-cream" role="status">Preparing your workspace…</main>;
  if (!user) return <Navigate to="/login" state={{from:location.pathname}} replace/>;
  return <AppLayout key={user.uid}/>;
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<RequireAuth/>}>
      <Route index element={<Navigate to="/dashboard" replace/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="/history" element={<History/>}/>
      <Route path="/analytics" element={<Analytics/>}/>
      <Route path="/budgets" element={<Budgets/>}/>
      <Route path="/streaks" element={<Streaks/>}/>
      <Route path="/profile" element={<Profile/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes>;
}
