import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { api } from './api'
import Dashboard from './pages/Dashboard'
import GamesPage from './pages/GamesPage'
import GameDetailPage from './pages/GameDetailPage'
import LauncherPage from './pages/LauncherPage'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import LandingPage from './pages/LandingPage'

// ===== Auth Context =====
export const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const useToast = () => useContext(ToastContext)
export const ToastContext = createContext(null)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ===== Sidebar =====
function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🎮 Tudex Games</h1>
        <span>Panel de Administración</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="nav-icon">📊</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/games" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="nav-icon">🕹️</span>
          <span>Juegos</span>
        </NavLink>
        <NavLink to="/launcher" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="nav-icon">🚀</span>
          <span>Launcher</span>
        </NavLink>
        <a href="/api/config" target="_blank" rel="noopener noreferrer">
          <span className="nav-icon">🔗</span>
          <span>Ver Config JSON</span>
        </a>
        <button onClick={onLogout} style={{ color: 'var(--danger)', marginTop: 'auto' }}>
          <span className="nav-icon">🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </nav>
      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
        </div>
      )}
    </aside>
  )
}

// ===== Auth Guard =====
function PrivateLayout({ user, onLogout }) {
  return (
    <div className="app-container">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:name" element={<GameDetailPage />} />
          <Route path="/launcher" element={<LauncherPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// ===== Main App =====
function AppContent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('tudex_token')
      if (!token) {
        // Check if setup is needed
        try {
          const health = await api.getHealth()
          if (health.status === 'ok') {
            // Try to get user - if no admin exists, setup is needed
            try {
              const me = await api.getMe()
              setUser(me)
            } catch {
              setLoading(false)
            }
          }
        } catch {
          setLoading(false)
        }
        setLoading(false)
        return
      }
      try {
        const me = await api.getMe()
        setUser(me)
      } catch {
        localStorage.removeItem('tudex_token')
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogin = (token, userData) => {
    localStorage.setItem('tudex_token', token)
    setUser(userData)
    setNeedsSetup(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('tudex_token')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Cargando...
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<SetupPage onSetup={handleLogin} />} />
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />
        } />
        <Route path="/*" element={
          user
            ? <PrivateLayout user={user} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  )
}
