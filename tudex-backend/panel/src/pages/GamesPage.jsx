import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../App'

function CreateGameModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', display_name: '', start_cmd: 'start game.exe EGULANG', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const showToast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = await api.createGame(form)
    setLoading(false)
    if (data.error) {
      setError(data.error)
    } else {
      showToast(`Juego "${data.display_name}" creado ✓`)
      onCreated(data)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>🕹️ Nuevo Juego</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ID del juego <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(slug: solo minúsculas, números, guiones)</span></label>
            <input className="form-input" placeholder="mi-juego" value={form.name}
              onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
          </div>
          <div className="form-group">
            <label>Nombre para mostrar</label>
            <input className="form-input" placeholder="Mi Juego Épico" value={form.display_name}
              onChange={e => set('display_name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Comando de inicio <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>usa EGULANG para idioma/voz</span></label>
            <input className="form-input" placeholder="start game.exe EGULANG" value={form.start_cmd}
              onChange={e => set('start_cmd', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Descripción <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(opcional)</span></label>
            <textarea className="form-input" placeholder="Descripción del juego..." value={form.description}
              onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando...' : '✓ Crear Juego'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const navigate = useNavigate()
  const showToast = useToast()

  const loadGames = async () => {
    setLoading(true)
    const data = await api.getGames()
    setGames(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadGames() }, [])

  const handleToggleMaintenance = async (game) => {
    setTogglingId(game.id)
    const newState = !game.maintenance
    const data = await api.toggleMaintenance(game.name, newState)
    if (!data.error) {
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, maintenance: newState } : g))
      showToast(`${game.display_name}: ${newState ? 'En mantenimiento' : 'Activo'} ✓`)
    } else {
      showToast(data.error, 'error')
    }
    setTogglingId(null)
  }

  const handleDelete = async (game) => {
    if (!confirm(`¿Eliminar "${game.display_name}"? Esta acción no se puede deshacer.`)) return
    const data = await api.deleteGame(game.name)
    if (!data.error) {
      setGames(prev => prev.filter(g => g.id !== game.id))
      showToast(`Juego eliminado ✓`)
    } else {
      showToast(data.error, 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🕹️ Juegos</h2>
          <p>Gestiona los juegos disponibles en el launcher</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nuevo Juego
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Cargando juegos...</div>
      ) : games.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <div className="empty-state-text">No hay juegos aún</div>
          <div className="empty-state-hint">Crea tu primer juego para comenzar</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Crear primer juego
          </button>
        </div>
      ) : (
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="card game-card">
              {/* Background preview */}
              <div
                className={`game-card-bg ${!game.background_url ? 'no-bg' : ''}`}
                style={game.background_url ? { backgroundImage: `url(${game.background_url})` } : {}}
              />

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  className={`game-card-icon ${!game.icon_url ? 'no-icon' : ''}`}
                  style={game.icon_url ? { backgroundImage: `url(${game.icon_url})` } : {}}
                >
                  {!game.icon_url && '🎮'}
                </div>
                <div className="game-card-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="game-card-name">{game.display_name}</div>
                    <span className={`badge ${game.maintenance ? 'badge-warning' : game.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {game.maintenance ? '🔧 Mantenimiento' : game.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
                    id: {game.name}
                  </div>
                  <div className="game-card-meta">
                    <span className="game-card-stat">📦 Cliente v{game.client_ver}</span>
                    <span className="game-card-stat">🩹 {game.patch_count || 0} parches</span>
                  </div>
                </div>
              </div>

              <div className="game-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/games/${game.name}`)}>
                  ✏️ Gestionar
                </button>
                <button
                  className={`btn btn-sm ${game.maintenance ? 'btn-success' : 'btn-warning'}`}
                  onClick={() => handleToggleMaintenance(game)}
                  disabled={togglingId === game.id}
                >
                  {togglingId === game.id ? '...' : game.maintenance ? '✓ Reactivar' : '🔧 Mantenimiento'}
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(game)} title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGameModal
          onClose={() => setShowCreate(false)}
          onCreated={(g) => { setShowCreate(false); navigate(`/games/${g.name}`) }}
        />
      )}
    </div>
  )
}
