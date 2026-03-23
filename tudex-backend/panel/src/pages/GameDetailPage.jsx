import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../App'

// ===== Sub-components =====
function UploadSection({ title, icon, hint, accept, onUpload, currentUrl, uploading }) {
  const inputRef = useRef()

  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await onUpload(file)
    e.target.value = ''
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</span>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent-secondary)' }}>Ver actual ↗</a>
        )}
      </div>
      <div className="file-upload" onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
        <div className="file-upload-icon">{uploading ? '⏳' : icon}</div>
        <div className="file-upload-text">{uploading ? 'Subiendo...' : 'Click para seleccionar archivo'}</div>
        <div className="file-upload-hint">{hint}</div>
      </div>
      {currentUrl && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📁 {currentUrl.split('/').pop()}
        </div>
      )}
    </div>
  )
}

function VoicePackEditor({ gameName, initialPacks }) {
  const [packs, setPacks] = useState(initialPacks || [])
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const addPack = () => setPacks(p => [...p, { value: '', label: '' }])
  const removePack = (i) => setPacks(p => p.filter((_, idx) => idx !== i))
  const updatePack = (i, key, val) => setPacks(p => p.map((pack, idx) => idx === i ? { ...pack, [key]: val } : pack))

  const handleSave = async () => {
    setSaving(true)
    const data = await api.setVoicePacks(gameName, packs.filter(p => p.value && p.label))
    setSaving(false)
    if (Array.isArray(data)) {
      showToast('Voice packs actualizados ✓')
    } else {
      showToast(data.error || 'Error al guardar', 'error')
    }
  }

  return (
    <div>
      <div className="voice-pack-list">
        {packs.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Sin voice packs. El selector no aparecerá en el launcher.
          </div>
        )}
        {packs.map((pack, i) => (
          <div key={i} className="voice-pack-row">
            <input className="form-input" placeholder="Código (ej: EN)" value={pack.value}
              onChange={e => updatePack(i, 'value', e.target.value.toUpperCase())}
              style={{ maxWidth: 100 }} />
            <input className="form-input" placeholder="Nombre (ej: English)" value={pack.label}
              onChange={e => updatePack(i, 'label', e.target.value)} />
            <button className="btn btn-danger btn-sm btn-icon" onClick={() => removePack(i)}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={addPack}>+ Agregar</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : '✓ Guardar Voice Packs'}
        </button>
      </div>
    </div>
  )
}

// ===== Main Page =====
export default function GameDetailPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadingClient, setUploadingClient] = useState(false)
  const [uploadingPatch, setUploadingPatch] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [togglingMaint, setTogglingMaint] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const loadGame = async () => {
    const data = await api.getGame(name)
    setGame(data)
    setEditForm({ display_name: data.display_name, start_cmd: data.start_cmd, description: data.description || '' })
    setLoading(false)
  }

  useEffect(() => { loadGame() }, [name])

  const handleUploadClient = async (file) => {
    if (!file.name.endsWith('.7z')) { showToast('Solo se aceptan archivos .7z', 'error'); return }
    if (!confirm(`¿Subir nueva versión del cliente? Esto incrementará el clientVer y RESETEARÁ todos los parches actuales.`)) return
    setUploadingClient(true)
    const data = await api.uploadClient(name, file)
    setUploadingClient(false)
    if (data.error) { showToast(data.error, 'error') } else {
      showToast(data.message || `Cliente v${data.client_ver} subido ✓`)
      loadGame()
    }
  }

  const handleUploadPatch = async (file) => {
    if (!file.name.endsWith('.7z')) { showToast('Solo se aceptan archivos .7z', 'error'); return }
    setUploadingPatch(true)
    const data = await api.uploadPatch(name, file)
    setUploadingPatch(false)
    if (data.error) { showToast(data.error, 'error') } else {
      showToast(data.message || 'Parche subido ✓')
      loadGame()
    }
  }

  const handleUploadIcon = async (file) => {
    setUploadingIcon(true)
    const data = await api.uploadIcon(name, file)
    setUploadingIcon(false)
    if (data.error) { showToast(data.error, 'error') } else {
      showToast('Ícono actualizado ✓')
      loadGame()
    }
  }

  const handleUploadBg = async (file) => {
    setUploadingBg(true)
    const data = await api.uploadBackground(name, file)
    setUploadingBg(false)
    if (data.error) { showToast(data.error, 'error') } else {
      showToast('Fondo actualizado ✓')
      loadGame()
    }
  }

  const handleToggleMaintenance = async () => {
    setTogglingMaint(true)
    const data = await api.toggleMaintenance(name, !game.maintenance)
    setTogglingMaint(false)
    if (!data.error) {
      showToast(`Mantenimiento ${!game.maintenance ? 'activado' : 'desactivado'} ✓`)
      setGame(g => ({ ...g, maintenance: !g.maintenance }))
    } else {
      showToast(data.error, 'error')
    }
  }

  const handleSaveInfo = async () => {
    setSavingEdit(true)
    const data = await api.updateGame(name, editForm)
    setSavingEdit(false)
    if (data.error) { showToast(data.error, 'error') } else {
      showToast('Información actualizada ✓')
      setGame(g => ({ ...g, ...data }))
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>
  if (!game || game.error) return (
    <div className="empty-state">
      <div className="empty-state-icon">❌</div>
      <div className="empty-state-text">Juego no encontrado</div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/games')}>← Volver</button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/games')}>←</button>
        <div
          style={{
            width: 48, height: 48, borderRadius: 10, border: '2px solid var(--border-color)',
            backgroundImage: game.icon_url ? `url(${game.icon_url})` : undefined,
            backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
          }}
        >
          {!game.icon_url && '🎮'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{game.display_name}</h2>
            <span className={`badge ${game.maintenance ? 'badge-warning' : game.is_active ? 'badge-success' : 'badge-danger'}`}>
              {game.maintenance ? '🔧 Mantenimiento' : game.is_active ? '● Activo' : '○ Inactivo'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            id: {game.name} · Cliente v{game.client_ver} · {game.patches?.length || 0} parches
          </div>
        </div>
        <button
          className={`btn btn-sm ${game.maintenance ? 'btn-success' : 'btn-warning'}`}
          onClick={handleToggleMaintenance}
          disabled={togglingMaint}
        >
          {togglingMaint ? '...' : game.maintenance ? '✓ Reactivar' : '🔧 Activar Mantenimiento'}
        </button>
      </div>

      <div className="detail-sections">

        {/* General Info */}
        <div className="detail-section">
          <h3><span className="section-icon">📝</span> Información General</h3>
          <div className="form-group">
            <label>Nombre para mostrar</label>
            <input className="form-input" value={editForm?.display_name || ''}
              onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Comando de inicio</label>
            <input className="form-input" value={editForm?.start_cmd || ''}
              onChange={e => setEditForm(f => ({ ...f, start_cmd: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Usa <code style={{ background: 'var(--bg-input)', padding: '1px 4px', borderRadius: 3 }}>EGULANG</code> como placeholder de idioma/voz
            </div>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea className="form-input" value={editForm?.description || ''}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSaveInfo} disabled={savingEdit}>
            {savingEdit ? 'Guardando...' : '✓ Guardar Cambios'}
          </button>
        </div>

        {/* Assets */}
        <div className="detail-section">
          <h3><span className="section-icon">🖼️</span> Assets Visuales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <UploadSection
              title="Ícono del juego (barra lateral del launcher)"
              icon="🖼️"
              hint="SVG, PNG, JPG · max 5MB"
              accept=".svg,.png,.jpg,.jpeg,.webp"
              onUpload={handleUploadIcon}
              currentUrl={game.icon_url}
              uploading={uploadingIcon}
            />
            <UploadSection
              title="Imagen de fondo (pantalla principal del launcher)"
              icon="🌄"
              hint="JPG, PNG, WEBP · max 20MB · recomendado 1280×720"
              accept=".jpg,.jpeg,.png,.webp"
              onUpload={handleUploadBg}
              currentUrl={game.background_url}
              uploading={uploadingBg}
            />
          </div>
        </div>

        {/* Client Upload */}
        <div className="detail-section">
          <h3><span className="section-icon">📦</span> Cliente del Juego</h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-secondary)' }}>v{game.client_ver}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>versión actual</div>
            </div>
            {game.client_url && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>URL actual:</div>
                <div style={{ fontSize: 12, color: 'var(--accent-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {game.client_url}
                </div>
              </div>
            )}
          </div>
          <UploadSection
            title="Subir nuevo cliente completo (.7z)"
            icon="📦"
            hint="Incrementa clientVer y resetea todos los parches · max 5GB"
            accept=".7z"
            onUpload={handleUploadClient}
            currentUrl={null}
            uploading={uploadingClient}
          />
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(240, 180, 41, 0.1)', border: '1px solid rgba(240, 180, 41, 0.2)', borderRadius: 6, fontSize: 12, color: 'var(--warning)' }}>
            ⚠️ Subir un nuevo cliente incrementará automáticamente el clientVer y reseteará todos los parches.
          </div>
        </div>

        {/* Patches */}
        <div className="detail-section">
          <h3><span className="section-icon">🩹</span> Parches</h3>
          <div style={{ marginBottom: 12 }}>
            {!game.patches || game.patches.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                Sin parches. El launcher mostrará solo el cliente base.
              </div>
            ) : (
              <div className="patches-list">
                {game.patches.map(patch => (
                  <div key={patch.id} className="patch-item">
                    <div className="patch-order">#{patch.patch_order}</div>
                    <div className="patch-url">{patch.patch_url.split('/').pop()}</div>
                    <a href={patch.patch_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--accent-secondary)', flexShrink: 0 }}>↗</a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <UploadSection
            title="Agregar nuevo parche (.7z)"
            icon="🩹"
            hint="Se agrega al final de la lista en orden · max 5GB"
            accept=".7z"
            onUpload={handleUploadPatch}
            currentUrl={null}
            uploading={uploadingPatch}
          />
        </div>

        {/* Voice Packs */}
        <div className="detail-section full-width">
          <h3><span className="section-icon">🎙️</span> Voice Packs</h3>
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            Define los paquetes de voz disponibles. El código se inyecta en el parámetro <code style={{ background: 'var(--bg-input)', padding: '1px 4px', borderRadius: 3 }}>EGULANG</code> al iniciar el juego.
            Si está vacío, el selector no aparece en el launcher.
          </div>
          <VoicePackEditor gameName={name} initialPacks={game.voicePacks || []} />
        </div>

      </div>
    </div>
  )
}
