import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Dashboard() {
  const [games, setGames] = useState([])
  const [launcherVer, setLauncherVer] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [g, lv, h] = await Promise.all([
          api.getGames(),
          api.getLauncherVersion(),
          api.getHealth(),
        ])
        setGames(Array.isArray(g) ? g : [])
        setLauncherVer(lv)
        setHealth(h)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const activeGames = games.filter(g => g.is_active)
  const maintenanceGames = games.filter(g => g.maintenance)

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Bienvenido al panel de administración de Tudex Games</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={`badge ${health?.status === 'ok' ? 'badge-success' : 'badge-danger'}`}>
            {health?.status === 'ok' ? '● API Online' : '● API Offline'}
          </div>
          <a href="/api/config" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            🔗 Ver JSON del Launcher
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{games.length}</div>
          <div className="stat-card-label">Juegos registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{activeGames.length}</div>
          <div className="stat-card-label">Juegos activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: maintenanceGames.length > 0 ? 'var(--warning)' : undefined }}>
            {maintenanceGames.length}
          </div>
          <div className="stat-card-label">En mantenimiento</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">v{launcherVer?.version || 1}</div>
          <div className="stat-card-label">Versión del Launcher</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">⚡ Acciones Rápidas</div>
              <div className="card-subtitle">Gestiona tu plataforma</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate('/games')}>
              🕹️ Gestionar Juegos
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/launcher')}>
              🚀 Actualizar Launcher
            </button>
            <a href="/api/config" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              📋 Ver configuración JSON
            </a>
          </div>
        </div>

        {/* Games status */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🕹️ Estado de Juegos</div>
              <div className="card-subtitle">Resumen rápido</div>
            </div>
          </div>
          {games.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>🎮</div>
              <div className="empty-state-text" style={{ fontSize: 14 }}>Sin juegos aún</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/games')}>
                + Agregar juego
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {games.slice(0, 5).map(game => (
                <div key={game.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{game.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{game.client_ver} · {game.patch_count} parches</div>
                  </div>
                  <div className={`badge ${game.maintenance ? 'badge-warning' : game.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {game.maintenance ? 'Mantenimiento' : game.is_active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              ))}
              {games.length > 5 && (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/games')}>
                  Ver todos ({games.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Config preview */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">📡 Cómo conectar el Launcher</div>
            <div className="card-subtitle">El archivo .exe debe apuntar a esta URL</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-secondary)' }}>
          {window.location.origin}/api/config
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          💡 Configura esta URL en <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>src/constants/index.js → DEFAULT_CONFIG.updaterUrl</code>
        </div>
      </div>
    </div>
  )
}
