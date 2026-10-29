import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import { Loading } from './components/common'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Payments from './pages/Payments'
import Transfers from './pages/Transfers'
import Community from './pages/Community'
import Catalogue from './pages/Catalogue'
import Picks from './pages/Picks'
import Leagues from './pages/Leagues'
import Settings from './pages/Settings'
import Releases from './pages/Releases'
import Operations from './pages/Operations'
import Admins from './pages/Admins'
import Audit from './pages/Audit'
import Account from './pages/Account'

export default function App() {
  const { admin, loading } = useAuth()
  if (loading) return <Loading />
  if (!admin) return <Login />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/community" element={<Community />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/picks" element={<Picks />} />
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/admins" element={<Admins />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
