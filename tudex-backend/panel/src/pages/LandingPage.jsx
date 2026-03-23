import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Usamos el endpoint público que usa el propio launcher para pintar la web
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error cargando config:", err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="landing-page">
      {/* Navbar Minimalista */}
      <nav className="landing-nav">
        <div className="landing-container nav-content">
          <div className="logo-text">
            🎮 <span>Tudex</span> Games
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>
            Acceso Devs
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-glow"></div>
        <div className="landing-container hero-content">
          <div className="badge hero-badge">NUEVA PLATAFORMA</div>
          <h1 className="hero-title">
            Tus juegos favoritos.<br />
            <span className="text-gradient">En un solo lugar.</span>
          </h1>
          <p className="hero-subtitle">
            Descarga nuestro launcher oficial para mantener todos tus juegos actualizados automáticamente. Parches, paquetes de voz y novedades al instante.
          </p>
          
          <div className="hero-actions">
            {loading ? (
              <button className="btn btn-primary hero-btn" disabled>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Cargando...
              </button>
            ) : config?.launcherUrl ? (
              <a href={config.launcherUrl} className="btn btn-primary hero-btn download-btn">
                <span className="icon">⬇️</span>
                <span>
                  Descargar Launcher <br />
                  <small>Versión {config.launcherVer} para Windows</small>
                </span>
              </a>
            ) : (
              <button className="btn btn-primary hero-btn" disabled>
                Launcher no disponible
              </button>
            )}
            <a href="#games" className="btn btn-secondary hero-btn">
              Ver Catálogo
            </a>
          </div>
        </div>
      </header>

      {/* Catálogo de Juegos */}
      <section id="games" className="games-section">
        <div className="landing-container">
          <div className="section-header">
            <h2>Juegos Disponibles</h2>
            <p>Descubre los títulos disponibles en nuestra plataforma</p>
          </div>

          {loading ? (
            <div className="loading" style={{ minHeight: 300 }}>
              <div className="spinner" /> Cargando catálogo...
            </div>
          ) : !config?.games || config.games.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 300 }}>
              <div className="empty-state-icon">🎮</div>
              <div className="empty-state-text">Próximamente...</div>
              <div className="empty-state-hint">Aún no hay juegos publicados.</div>
            </div>
          ) : (
            <div className="landing-games-grid">
              {config.games.map((game, i) => (
                <div key={i} className="landing-game-card">
                  <div 
                    className="landing-game-bg"
                    style={{ backgroundImage: game.backgroundUrl ? `url(${game.backgroundUrl})` : 'none' }}
                  >
                    {!game.backgroundUrl && <div className="no-bg-placeholder"></div>}
                    <div className="landing-game-overlay"></div>
                    {game.maintenance && (
                      <div className="maintenance-badge">En Mantenimiento</div>
                    )}
                  </div>
                  <div className="landing-game-content">
                    <div 
                      className="landing-game-icon"
                      style={{ backgroundImage: game.iconUrl ? `url(${game.iconUrl})` : 'none' }}
                    >
                      {!game.iconUrl && '🎮'}
                    </div>
                    <div className="landing-game-info">
                      <h3>{game.display_name || game.name}</h3>
                      <div className="landing-game-meta">
                        <span>v{game.clientVer}</span>
                        {game.patchUrls && game.patchUrls.length > 0 && (
                          <span>• {game.patchUrls.length} Parches</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <p>© {new Date().getFullYear()} Tudex Games. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
