import React, { useState } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function SetupPage({ onSetup }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      const data = await api.setup(form.email, form.password, form.name)
      if (data.token) {
        onSetup(data.token, data.user)
        navigate('/dashboard')
      } else {
        setError(data.error || 'Error al crear el administrador')
      }
    } catch {
      setError('Error al conectar con el servidor')
    }
    setLoading(false)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 460 }}>
        <h1>🚀 Setup Inicial</h1>
        <p className="subtitle">Crea tu cuenta de administrador</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input className="form-input" placeholder="Tu nombre" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" placeholder="admin@tudexgames.com"
              value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input className="form-input" type="password" placeholder="Mínimo 8 caracteres"
              value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input className="form-input" type="password" placeholder="Repite la contraseña"
              value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
          </div>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Configurando...</> : '✓ Crear Administrador'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  )
}
