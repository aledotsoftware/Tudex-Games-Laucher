import React, { useState } from 'react'
import { api } from '../api'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      if (data.token) {
        onLogin(data.token, data.user)
      } else {
        setError(data.error || 'Credenciales inválidas')
      }
    } catch {
      setError('Error al conectar con el servidor')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🎮 Tudex Games</h1>
        <p className="subtitle">Panel de Administración</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@tudexgames.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Ingresando...</> : '→ Ingresar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/setup" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            ¿Primera vez? Configurar administrador
          </a>
        </div>
      </div>
    </div>
  )
}
