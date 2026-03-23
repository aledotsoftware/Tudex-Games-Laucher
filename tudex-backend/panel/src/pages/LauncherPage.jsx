import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { useToast } from '../App'

export default function LauncherPage() {
  const [versions, setVersions] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [changelog, setChangelog] = useState('')
  const inputRef = useRef()
  const showToast = useToast()

  const loadData = async () => {
    setLoading(true)
    const [vers, cur] = await Promise.all([
      api.getLauncherVersions(),
      api.getLauncherVersion(),
    ])
    setVersions(Array.isArray(vers) ? vers : [])
    setCurrent(cur)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.exe')) {
      showToast('Solo se aceptan archivos .exe', 'error')
      return
    }
    if (!confirm(`¿Publicar nueva versión del launcher "${file.name}"? Los usuarios serán notificados al abrir el launcher.`)) {
      e.target.value = ''
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('launcher', file)
    if (changelog) formData.append('changelog', changelog)

    const token = localStorage.getItem('tudex_token')
    const res = await fetch('/api/launcher/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const data = await res.json()
    setUploading(false)
    if (data.error) {
      showToast(data.error, 'error')
    } else {
      showToast(data.message || `Launcher v${data.version} publicado ✓`)
      setChangelog('')
      loadData()
    }
    e.target.value = ''
  }

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🚀 Gestión del Launcher</h2>
          <p>Publica nuevas versiones del ejecutable del launcher</p>
        </div>
      </div>

      {/* Current version */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">📦 Versión Actual</div>
            <div className="card-subtitle">Esta es la versión que el launcher compara</div>
          </div>
          <div className="badge badge-success">● En producción</div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              v{current?.version || 1}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>versión del launcher</div>
          </div>
          {current?.download_url && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>URL de descarga:</div>
              <div style={{ fontSize: 13, color: 'var(--accent-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.download_url}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload new version */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">⬆️ Publicar Nueva Versión</div>
            <div className="card-subtitle">El launcher se descargará automáticamente al arrancar</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Changelog <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(opcional)</span></label>
            <textarea className="form-input" placeholder="¿Qué cambió en esta versión? Ej: Mejoras de rendimiento, nuevo diseño..."
              value={changelog} onChange={e => setChangelog(e.target.value)} rows={2} />
          </div>

          <div className="file-upload" onClick={() => !uploading && inputRef.current?.click()}
            style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
            <input ref={inputRef} type="file" accept=".exe" onChange={handleFileChange} style={{ display: 'none' }} />
            <div className="file-upload-icon">{uploading ? '⏳' : '🚀'}</div>
            <div className="file-upload-text">{uploading ? 'Subiendo launcher...' : 'Seleccionar TudexGamesLauncher.exe'}</div>
            <div className="file-upload-hint">Solo archivos .exe · max 200MB</div>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(108, 92, 231, 0.08)', border: '1px solid rgba(108, 92, 231, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent-secondary)' }}>
            💡 Al subir una nueva versión, el número de versión se incrementa automáticamente y el launcher se actualizará solo al próximo inicio del usuario.
          </div>
        </div>
      </div>

      {/* Version history */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Historial de Versiones</div>
        </div>
        {versions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 24 }}>Sin versiones publicadas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {versions.map(v => (
              <div key={v.id} style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px',
                background: 'var(--bg-input)', borderRadius: 8,
                border: v.is_current ? '1px solid var(--accent-primary)' : '1px solid transparent'
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: v.is_current ? 'var(--accent-secondary)' : 'var(--text-primary)', minWidth: 40 }}>
                  v{v.version}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {v.changelog && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{v.changelog}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.download_url}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {v.is_current && <span className="badge badge-success">● Actual</span>}
                  <a href={v.download_url} className="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
                    ↓ Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
