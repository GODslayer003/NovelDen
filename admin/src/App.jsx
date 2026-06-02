import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import toast from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Books from './pages/Books'
import WritersAdmin from './pages/WritersAdmin'
import NewsAdmin from './pages/NewsAdmin'
import UsersAdmin from './pages/UsersAdmin'
import { API_URL } from './config/api'

const ALL_NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/books', label: '📚 Books' },
  { to: '/writers', label: '✍️ Writers' },
  { to: '/news', label: '📰 News' },
  { to: '/users', label: '👥 Users' },
]

export default function App() {
  const loc = useLocation()
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminRole, setAdminRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)

  // Verify stored token on load
  useEffect(() => {
    const token = localStorage.getItem('novelden_admin_token')
    const userStr = localStorage.getItem('novelden_admin_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'admin' || user.role === 'superadmin') {
          setIsAdminLoggedIn(true)
          setAdminRole(user.role)
        }
      } catch (_) {}
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthenticating(true)
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email: email.trim(), password })
      if (res.data.success || res.data.token) {
        const { token, user } = res.data
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          toast.error('Access denied. Admin credentials required.')
          setAuthenticating(false)
          return
        }
        localStorage.setItem('novelden_admin_token', token)
        localStorage.setItem('novelden_admin_user', JSON.stringify(user))
        setIsAdminLoggedIn(true)
        setAdminRole(user.role)
        toast.success(`Welcome, ${user.role === 'superadmin' ? 'Superadmin' : 'Admin'} ${user.name}!`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid admin credentials')
    } finally {
      setAuthenticating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('novelden_admin_token')
    localStorage.removeItem('novelden_admin_user')
    setIsAdminLoggedIn(false)
    toast.success('Logged out successfully')
  }

  // ── ADMIN LOGIN SCREEN ──
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#120a02] text-[#F5E6D3]">
        <Toaster position="top-right" toastOptions={{ style: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #d4a574' } }} />
        
        {/* Glass Box */}
        <div className="relative w-full max-w-md p-8 rounded-3xl border shadow-2xl"
             style={{
               background: 'linear-gradient(135deg, rgba(44, 24, 16, 0.95), rgba(26, 15, 0, 0.98))',
               borderColor: 'rgba(212, 165, 116, 0.2)'
             }}>
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center mb-8">
            <h2 className="font-serif font-black text-3xl"
                style={{
                  background: 'linear-gradient(135deg, #F5E6D3, #d4a574)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
              Den Master
            </h2>
            <p className="text-xs text-yellow-600 font-sans tracking-widest mt-1">NOVEL DEN ADMIN PANEL</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-2">Admin Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@novelden.com"
                className="w-full px-4 py-3.5 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors bg-black/40 text-coffee-100"
                style={{ borderColor: 'rgba(212, 165, 116, 0.15)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-sans text-coffee-400 uppercase tracking-wider mb-2">Secret Code / Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3.5 rounded-xl font-sans text-sm outline-none border focus:border-yellow-600 transition-colors bg-black/40 text-coffee-100"
                  style={{ borderColor: 'rgba(212, 165, 116, 0.15)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-200 text-sm font-sans"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={authenticating}
              className="w-full py-4 rounded-xl font-sans font-bold text-sm text-espresso mt-8 transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #d4a574, #c08040)',
                boxShadow: '0 4px 20px rgba(192, 128, 64, 0.25)'
              }}
            >
              {authenticating ? 'Verifying Admin Authority...' : 'Unlock Portal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── LOGGED IN PANEL VIEW ──
  return (
    <div className="flex min-h-screen bg-[#1a0f00] text-[#F5E6D3]">
      <Toaster position="top-right" toastOptions={{ style: { background: '#2C1810', color: '#F5E6D3', border: '1px solid #d4a574' } }} />

      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col py-8 px-4 gap-2 border-r"
        style={{ background: '#2C1810', borderColor: 'rgba(212,165,116,0.1)' }}
      >
        <div className="px-3 mb-8">
          <p
            className="font-serif font-black text-2xl"
            style={{
              background: 'linear-gradient(135deg, #F5E6D3, #d4a574)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Novel Den
          </p>
          <p className="text-[10px] text-yellow-600 font-sans tracking-widest mt-0.5 font-bold">ADMIN PANEL</p>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {ALL_NAV.filter(n => n.to !== '/users' || adminRole === 'superadmin').map(n => (
            <Link
              key={n.to}
              to={n.to}
              className="px-4 py-3 rounded-xl font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-200"
              style={{
                background: loc.pathname === n.to ? 'rgba(212,165,116,0.15)' : 'transparent',
                color:      loc.pathname === n.to ? '#d4a574' : '#9a7a6a',
                border:     loc.pathname === n.to ? '1px solid rgba(212,165,116,0.2)' : '1px solid transparent',
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto px-4 py-3 rounded-xl border border-red-900/30 text-xs font-sans font-bold text-red-400 hover:bg-red-900/10 transition-colors uppercase tracking-wider text-left"
        >
          🔒 Lock Portal
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/books" element={<Books />} />
          <Route path="/writers" element={<WritersAdmin />} />
          <Route path="/news" element={<NewsAdmin />} />
          {adminRole === 'superadmin' && <Route path="/users" element={<UsersAdmin />} />}
        </Routes>
      </main>
    </div>
  )
}
