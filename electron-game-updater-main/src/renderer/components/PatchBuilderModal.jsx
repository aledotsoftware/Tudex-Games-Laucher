import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
const { ipcRenderer } = require("electron");

export const PatchBuilderModal = ({ isOpen, onClose }) => {
  const [game, setGame] = useState("juego1");
  const [version, setVersion] = useState(2);
  const [fromVersion, setFromVersion] = useState(1);
  const [newDir, setNewDir] = useState("");
  const [oldDir, setOldDir] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8081");
  const [outDir, setOutDir] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    const handleLog = (event, text) => {
      setLogs((prev) => [...prev, text]);
    };

    const handleComplete = (event, { success }) => {
      setIsBuilding(false);
      setLogs((prev) => [
        ...prev,
        success
          ? "\n✨ Parche diferencial generado con éxito en la carpeta de salida!"
          : "\n❌ Error al generar el parche. Revisa la consola arriba."
      ]);
    };

    ipcRenderer.on("patch-builder-log", handleLog);
    ipcRenderer.on("patch-builder-complete", handleComplete);

    return () => {
      ipcRenderer.removeListener("patch-builder-log", handleLog);
      ipcRenderer.removeListener("patch-builder-complete", handleComplete);
    };
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleSelectDir = async (setter) => {
    try {
      const selected = await ipcRenderer.invoke("select-directory");
      if (selected) {
        setter(selected);
      }
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const handleBuild = () => {
    if (!newDir) {
      alert("Por favor selecciona la carpeta con la versión nueva del juego.");
      return;
    }

    setIsBuilding(true);
    setLogs(["Iniciando generación de parche diferencial...\n"]);

    ipcRenderer.send("run-patch-builder", {
      game,
      version,
      fromVersion: oldDir ? fromVersion : null,
      newDir,
      oldDir: oldDir || null,
      baseUrl,
      outDir: outDir || null
    });
  };

  return (
    <div className="patch-builder-overlay">
      <div className="patch-builder-modal">
        <div className="patch-builder-header">
          <h2>🛠️ Creador de Parches Diferenciales</h2>
          <button className="close-btn" onClick={onClose} disabled={isBuilding}>
            ✕
          </button>
        </div>

        <div className="patch-builder-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre del Juego:</label>
              <input
                type="text"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                placeholder="ej: juego1"
                disabled={isBuilding}
              />
            </div>

            <div className="form-group">
              <label>Versión Objetivo (Nueva):</label>
              <input
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value, 10))}
                disabled={isBuilding}
              />
            </div>

            <div className="form-group">
              <label>Versión Base (Anterior):</label>
              <input
                type="number"
                min="0"
                value={fromVersion}
                onChange={(e) => setFromVersion(parseInt(e.target.value, 10))}
                placeholder="0 si es instalación completa"
                disabled={isBuilding}
              />
            </div>

            <div className="form-group full-width">
              <label>Carpeta de la Versión Nueva (*Requerido):</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value)}
                  placeholder="Selecciona carpeta de la versión nueva..."
                  disabled={isBuilding}
                />
                <button
                  type="button"
                  onClick={() => handleSelectDir(setNewDir)}
                  disabled={isBuilding}
                >
                  Examinar...
                </button>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Carpeta de la Versión Anterior (Opcional - para Parche Diferencial):</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={oldDir}
                  onChange={(e) => setOldDir(e.target.value)}
                  placeholder="Dejar vacío si es instalación completa v1..."
                  disabled={isBuilding}
                />
                <button
                  type="button"
                  onClick={() => handleSelectDir(setOldDir)}
                  disabled={isBuilding}
                >
                  Examinar...
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>URL Base del Servidor Web:</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8081"
                disabled={isBuilding}
              />
            </div>

            <div className="form-group full-width">
              <label>Carpeta de Salida Web (public_html):</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={outDir}
                  onChange={(e) => setOutDir(e.target.value)}
                  placeholder="Por defecto: ./public_html"
                  disabled={isBuilding}
                />
                <button
                  type="button"
                  onClick={() => handleSelectDir(setOutDir)}
                  disabled={isBuilding}
                >
                  Examinar...
                </button>
              </div>
            </div>
          </div>

          <div className="console-section">
            <label>Consola de Salida:</label>
            <div className="console-log">
              {logs.map((log, index) => (
                <span key={index}>{log}</span>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        <div className="patch-builder-footer">
          <button className="secondary-btn" onClick={onClose} disabled={isBuilding}>
            Cerrar
          </button>
          <button
            className="primary-btn"
            onClick={handleBuild}
            disabled={isBuilding || !newDir}
          >
            {isBuilding ? "Comprimiendo Parche..." : "⚡ Generar Parche Diferencial"}
          </button>
        </div>
      </div>
    </div>
  );
};

PatchBuilderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
