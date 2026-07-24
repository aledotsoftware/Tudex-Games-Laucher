import React, { useState, useEffect, useRef } from "react";
const { ipcRenderer } = require("electron");
import "./styles.scss";

export const AdminStudioApp = () => {
  const [game, setGame] = useState("neo");
  const [newDir, setNewDir] = useState("");
  const [oldDir, setOldDir] = useState("");
  const [version, setVersion] = useState(1);
  const [fromVersion, setFromVersion] = useState(0);
  const [volumeSize, setVolumeSize] = useState("50m");
  const [baseUrl, setBaseUrl] = useState("https://updates.tudexnetworks.com/tudexgames");
  const [outDir, setOutDir] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // FTP Settings
  const [ftpConfig, setFtpConfig] = useState({
    enabled: false,
    host: "",
    port: "21",
    user: "",
    password: "",
    remoteDir: "/public_html"
  });

  const [logs, setLogs] = useState([
    "Bienvenido a Tudex Patch Studio (Admin)\nSelecciona la carpeta de la nueva versión y presiona 'Generar y Publicar'.\n"
  ]);
  const [lastBuildStats, setLastBuildStats] = useState(null);
  const logEndRef = useRef(null);

  // Load saved settings & game history on start
  useEffect(() => {
    async function initSettings() {
      try {
        const settings = await ipcRenderer.invoke("load-studio-settings");
        if (settings && settings.ftp) {
          setFtpConfig(settings.ftp);
        }
        if (settings && settings.games && settings.games[game]) {
          const gameHist = settings.games[game];
          if (gameHist.lastVersion) {
            setVersion(gameHist.lastVersion + 1);
            setFromVersion(gameHist.lastVersion);
            if (gameHist.lastBuildPath) {
              setOldDir(gameHist.lastBuildPath);
            }
          }
        }
      } catch (err) {
        console.error("Error loading studio settings:", err);
      }
    }
    initSettings();
  }, [game]);

  useEffect(() => {
    const handleLog = (event, text) => {
      setLogs((prev) => [...prev, text]);
    };

    const handleComplete = (event, { success, ftpSuccess, ftpError }) => {
      setIsBuilding(false);
      if (success) {
        let msg = "\n=====================================================\n" +
                  "✨ ¡ACTUALIZACIÓN PUBLICADA Y GENERADA CON ÉXITO!\n" +
                  "📁 Archivos generados en la carpeta public_html/";
        if (ftpSuccess) {
          msg += "\n🌐 ¡Los archivos se subieron correctamente a tu servidor FTP!";
        }
        msg += "\n=====================================================\n";

        setLogs((prev) => [...prev, msg]);
        setLastBuildStats({
          time: new Date().toLocaleTimeString(),
          game,
          version
        });
      } else {
        setLogs((prev) => [
          ...prev,
          `\n❌ Ocurrió un error en el proceso: ${ftpError || "Revisa la consola abajo."}`
        ]);
      }
    };

    ipcRenderer.on("patch-builder-log", handleLog);
    ipcRenderer.on("patch-builder-complete", handleComplete);

    return () => {
      ipcRenderer.removeListener("patch-builder-log", handleLog);
      ipcRenderer.removeListener("patch-builder-complete", handleComplete);
    };
  }, [game, version]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSelectNewDir = async () => {
    try {
      const selected = await ipcRenderer.invoke("select-directory");
      if (selected) {
        setNewDir(selected);
      }
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const handleSaveFtpConfig = async (newConfig) => {
    setFtpConfig(newConfig);
    try {
      const currentSettings = await ipcRenderer.invoke("load-studio-settings");
      await ipcRenderer.invoke("save-studio-settings", {
        ...currentSettings,
        ftp: newConfig
      });
    } catch (e) {
      console.error("Error saving FTP settings:", e);
    }
  };

  const handleOneClickBuildAndPublish = () => {
    if (!newDir) {
      alert("Por favor selecciona la carpeta con la nueva versión del juego.");
      return;
    }

    setIsBuilding(true);
    setLogs(["⚡ Iniciando empaquetado de versión de 1-Click...\n"]);

    ipcRenderer.send("run-patch-builder", {
      game,
      version,
      fromVersion: oldDir ? fromVersion : null,
      volumeSize,
      newDir,
      oldDir: oldDir || null,
      baseUrl,
      outDir: outDir || null,
      autoFtp: ftpConfig.enabled,
      ftpConfig
    });
  };

  return (
    <div className="admin-studio-container">
      <header className="admin-header">
        <div className="brand">
          <h1>🛠️ Tudex Patch Studio (Publicador 1-Click)</h1>
          <span className="subtitle">Selecciona la carpeta del juego y publica tu actualización al instante sin comandos</span>
        </div>
        <div className="status-badges">
          <span className="badge success">● Modo 1-Click Activo</span>
          <span className="badge info">● Engine Ready</span>
        </div>
      </header>

      <main className="admin-content">
        {/* PANEL PRINCIPAL 1-CLICK */}
        <div className="admin-panel shadow" style={{ border: "2px solid #6366f1", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ color: "#fff", marginTop: 0, marginBottom: "15px", fontSize: "1.4rem" }}>
            🚀 Publicar Nueva Versión del Juego
          </h2>

          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#94a3b8", display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Identificador del Juego:
              </label>
              <input
                type="text"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                placeholder="ej: neo"
                disabled={isBuilding}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ color: "#94a3b8", display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Versión a Generar:
              </label>
              <div style={{ padding: "10px", background: "#1e293b", borderRadius: "6px", color: "#38bdf8", fontWeight: "bold" }}>
                v{version} {oldDir ? `(Parche automático desde v${fromVersion})` : "(Cliente Completo v1)"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              📁 Carpeta de la Nueva Versión del Juego:
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={newDir}
                onChange={(e) => setNewDir(e.target.value)}
                placeholder="Haz clic en 'Seleccionar Carpeta' para elegir la carpeta del nuevo build..."
                disabled={isBuilding}
                style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.95rem" }}
              />
              <button
                type="button"
                onClick={handleSelectNewDir}
                disabled={isBuilding}
                style={{ padding: "12px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.95rem" }}
              >
                📁 Seleccionar Carpeta
              </button>
            </div>
          </div>

          {/* BOTON GIGANTE 1-CLICK */}
          <button
            onClick={handleOneClickBuildAndPublish}
            disabled={isBuilding || !newDir}
            style={{
              width: "100%",
              padding: "16px",
              background: isBuilding ? "#475569" : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.2rem",
              fontWeight: "bold",
              cursor: isBuilding || !newDir ? "not-allowed" : "pointer",
              boxShadow: isBuilding ? "none" : "0 4px 14px rgba(34, 197, 94, 0.4)",
              transition: "all 0.2s"
            }}
          >
            {isBuilding ? "⏳ Generando y Publicando Actualización..." : "🚀 GENERAR Y PUBLICAR ACTUALIZACIÓN (1-CLICK)"}
          </button>

          <div style={{ marginTop: "15px", textAlign: "right" }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" }}
            >
              {showAdvanced ? "▲ Ocultar Configuración Avanzada / FTP" : "⚙️ Configuración Avanzada / FTP Servidor ▼"}
            </button>
          </div>
        </div>

        {/* CONFIGURACIÓN AVANZADA Y FTP (OPCIONAL) */}
        {showAdvanced && (
          <div className="admin-panel shadow" style={{ marginTop: "15px", background: "#1e293b", padding: "20px", borderRadius: "10px" }}>
            <h3 style={{ color: "#fff", marginTop: 0 }}>⚙️ Configuración de Servidor Web y FTP</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={ftpConfig.enabled}
                  onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, enabled: e.target.checked })}
                  style={{ marginRight: "8px" }}
                />
                Subir automáticamente por FTP al terminar de compilar
              </label>
            </div>

            {ftpConfig.enabled && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Servidor FTP (Host):</label>
                  <input
                    type="text"
                    value={ftpConfig.host}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, host: e.target.value })}
                    placeholder="ftp.miservidor.com o IP"
                    style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Puerto (Por defecto 21):</label>
                  <input
                    type="text"
                    value={ftpConfig.port}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, port: e.target.value })}
                    placeholder="21"
                    style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Usuario FTP:</label>
                  <input
                    type="text"
                    value={ftpConfig.user}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, user: e.target.value })}
                    placeholder="usuario_ftp"
                    style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Contraseña FTP:</label>
                  <input
                    type="password"
                    value={ftpConfig.password}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, password: e.target.value })}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Directorio Remoto en el Servidor:</label>
                  <input
                    type="text"
                    value={ftpConfig.remoteDir}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, remoteDir: e.target.value })}
                    placeholder="/public_html"
                    style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px", borderTop: "1px solid #334155", paddingTop: "15px" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Tamaño de Bloques (Chunks):</label>
                <select
                  value={volumeSize}
                  onChange={(e) => setVolumeSize(e.target.value)}
                  style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                >
                  <option value="50m">50 MB (Recomendado)</option>
                  <option value="100m">100 MB</option>
                  <option value="none">Sin dividir (Archivo único .7z)</option>
                </select>
              </div>

              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>URL Base Pública:</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:8081"
                  style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Carpeta de Salida Local (Default: ./public_html):</label>
                <input
                  type="text"
                  value={outDir}
                  onChange={(e) => setOutDir(e.target.value)}
                  placeholder="Por defecto: ./public_html"
                  style={{ width: "100%", padding: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "4px" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CONSOLA DE EJECUCIÓN */}
        <div className="console-panel shadow">
          <div className="console-header">
            <h4>💻 Consola de Ejecución y Estado</h4>
            {lastBuildStats && (
              <span className="last-build">Último parche publicado: {lastBuildStats.game} v{lastBuildStats.version} ({lastBuildStats.time})</span>
            )}
          </div>
          <div className="terminal">
            {logs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
};
