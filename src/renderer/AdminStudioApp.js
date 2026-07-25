import React, { useState, useEffect, useRef } from "react";
const { ipcRenderer } = require("electron");

import "./styles/shadcn-ui.scss";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/Card.js";
import { Badge } from "./components/ui/Badge.js";
import { Button } from "./components/ui/Button.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./components/ui/Table.js";
import { Progress } from "./components/ui/Progress.js";
import { Alert } from "./components/ui/Alert.js";

const DEFAULT_REMOTE_URL = "http://updates.tudexnetworks.com/tudexgames/config.json";

export const AdminStudioApp = () => {
  const [activeTab, setActiveTab] = useState("publish");
  
  // Remote Server State (Source of Truth)
  const [remoteUrl, setRemoteUrl] = useState(DEFAULT_REMOTE_URL);
  const [remoteConfig, setRemoteConfig] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState("checking"); // 'online' | 'offline' | 'checking'
  const [lastCheckTime, setLastCheckTime] = useState(null);
  
  // Selected Game & Build State
  const [game, setGame] = useState("neo");
  const [newDir, setNewDir] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // FTP Settings State
  const [ftpConfig, setFtpConfig] = useState({
    enabled: true,
    host: "",
    port: "21",
    user: "",
    password: "",
    remoteDir: "/public_html"
  });

  // Build Execution State
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStep, setBuildStep] = useState("");
  const [logs, setLogs] = useState([]);
  const [buildSuccessToast, setBuildSuccessToast] = useState(false);
  
  const logEndRef = useRef(null);

  // 1. Fetch Remote Source of Truth from Internet
  const checkRemoteServer = async (urlToCheck = remoteUrl) => {
    setRemoteStatus("checking");
    try {
      const response = await fetch(`${urlToCheck}?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setRemoteConfig(data);
        setRemoteStatus("online");
        setLastCheckTime(new Date().toLocaleTimeString());
        
        // Auto-select game if present in remote config
        if (data.games && data.games.length > 0 && !data.games.find(g => g.name === game)) {
          setGame(data.games[0].name);
        }
      } else {
        setRemoteStatus("offline");
      }
    } catch (err) {
      console.warn("Could not connect to remote config server:", err);
      setRemoteStatus("offline");
    }
  };

  // 2. Initial Setup: Load Studio Settings & Check Remote Server
  useEffect(() => {
    async function init() {
      try {
        const settings = await ipcRenderer.invoke("load-studio-settings");
        if (settings && settings.ftp) {
          setFtpConfig(settings.ftp);
        }
      } catch (err) {
        console.error("Error loading studio settings:", err);
      }
      checkRemoteServer();
    }
    init();
  }, []);

  // 3. Auto-scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // 4. Handle IPC log and completion messages
  useEffect(() => {
    const handleLog = (event, text) => {
      setLogs((prev) => [...prev, text]);
      
      // Infer progress percentage based on log messages
      if (text.includes("Analyzing files")) {
        setBuildStep("Análisis diferencial de archivos...");
        setBuildProgress(25);
      } else if (text.includes("Compressing")) {
        setBuildStep("Empaquetando volúmenes 7z (50MB)...");
        setBuildProgress(50);
      } else if (text.includes("FTP") || text.includes("Iniciando subida")) {
        setBuildStep("Subiendo archivos al servidor web FTP...");
        setBuildProgress(75);
      }
    };

    const handleComplete = (event, { success, ftpError }) => {
      setIsBuilding(false);
      if (success) {
        setBuildProgress(100);
        setBuildStep("🎉 Publicación completada con éxito");
        setBuildSuccessToast(true);
        setLogs((prev) => [
          ...prev,
          "\n✨ ¡NUEVA VERSIÓN PUBLICADA CON ÉXITO EN EL SERVIDOR REMOTO!\n"
        ]);
        // Refresh live remote config
        setTimeout(() => checkRemoteServer(), 2000);
      } else {
        setBuildStep("❌ Falló el proceso");
        setLogs((prev) => [
          ...prev,
          `\n❌ Error en la publicación: ${ftpError || "Consulta la consola abajo."}\n`
        ]);
      }
    };

    ipcRenderer.on("patch-builder-log", handleLog);
    ipcRenderer.on("patch-builder-complete", handleComplete);

    return () => {
      ipcRenderer.removeListener("patch-builder-log", handleLog);
      ipcRenderer.removeListener("patch-builder-complete", handleComplete);
    };
  }, [game]);

  // Compute live versions from remote config
  const getRemoteGameInfo = (gameName) => {
    if (!remoteConfig || !remoteConfig.games) return { currentVer: 0, nextVer: 1 };
    const remoteGame = remoteConfig.games.find(g => g.name === gameName);
    if (!remoteGame) return { currentVer: 0, nextVer: 1 };
    
    const currentVer = (remoteGame.patchUrls && remoteGame.patchUrls.length > 0)
      ? remoteGame.patchUrls.length
      : (remoteGame.clientVer || 0);
    
    return { currentVer, nextVer: currentVer + 1, remoteGame };
  };

  const { currentVer, nextVer } = getRemoteGameInfo(game);

  // Folder Select & Drag Handlers
  const handleSelectFolder = async () => {
    try {
      const selected = await ipcRenderer.invoke("select-directory");
      if (selected) setNewDir(selected);
    } catch (err) {
      console.error("Error selecting folder:", err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedPath = e.dataTransfer.files[0].path;
      if (droppedPath) setNewDir(droppedPath);
    }
  };

  const [generateFullClient, setGenerateFullClient] = useState(true);

  // Launch One-Click Release
  const handleOneClickPublish = () => {
    setIsBuilding(true);
    setBuildProgress(10);
    setBuildStep("Iniciando preparación...");
    setBuildSuccessToast(false);
    setLogs([`🚀 [${new Date().toLocaleTimeString()}] Iniciando publicación en vivo para '${game}'...\n`]);

    ipcRenderer.send("run-fast-update", {
      game,
      sourcePath: newDir || null,
      fullClient: generateFullClient
    });
  };

  // Launcher Build State
  const [launcherVersion, setLauncherVersion] = useState(4);
  const [launcherExePath, setLauncherExePath] = useState("");

  useEffect(() => {
    if (remoteConfig && remoteConfig.launcherVer) {
      setLauncherVersion(remoteConfig.launcherVer + 1);
    }
  }, [remoteConfig]);

  const handlePublishLauncher = () => {
    setIsBuilding(true);
    setBuildProgress(15);
    setBuildStep("Iniciando empaquetado del Launcher ejecutable...");
    setBuildSuccessToast(false);
    setLogs([`💻 [${new Date().toLocaleTimeString()}] Publicando nueva versión del Launcher (v${launcherVersion})...\n`]);

    ipcRenderer.send("run-launcher-builder", {
      version: launcherVersion,
      exePath: launcherExePath || null,
      autoFtp: ftpConfig.enabled
    });
  };

  // Save FTP Settings
  const handleSaveFtpConfig = async (newFtp) => {
    setFtpConfig(newFtp);
    try {
      const currentSettings = await ipcRenderer.invoke("load-studio-settings");
      await ipcRenderer.invoke("save-studio-settings", {
        ...currentSettings,
        ftp: newFtp
      });
    } catch (e) {
      console.error("Error saving FTP config:", e);
    }
  };

  return (
    <div className="shadcn-app">
      {/* HEADER PRINCIPAL */}
      <header className="shadcn-header">
        <div className="title-group">
          <h1>🛠️ Tudex Patch Studio <Badge variant="secondary">v2.0 Enterprise</Badge></h1>
          <p>Plataforma gráfica de publicación en 1-clic conectada al servidor remoto</p>
        </div>
        <div className="status-group">
          {remoteStatus === "online" && (
            <Badge variant="success" pulse>🟢 Servidor En Línea</Badge>
          )}
          {remoteStatus === "offline" && (
            <Badge variant="destructive">🔴 Servidor Desconectado</Badge>
          )}
          {remoteStatus === "checking" && (
            <Badge variant="warning">⏳ Verificando Servidor...</Badge>
          )}
          <Button variant="outline" onClick={() => checkRemoteServer()}>
            🔄 Sincronizar
          </Button>
        </div>
      </header>

      {/* NOTIFICACIÓN DE ÉXITO DE PUBLICACIÓN */}
      {buildSuccessToast && (
        <Alert
          variant="success"
          icon="🎉"
          title="¡Publicación Exitosa en Producción!"
          description="La actualización ha sido procesada y publicada en el servidor remoto."
        />
      )}

      {/* TABBED INTERFACE SHADCN/UI */}
      <Tabs>
        <TabsList>
          <TabsTrigger active={activeTab === "publish"} onClick={() => setActiveTab("publish")}>
            🚀 Publicación de Juego
          </TabsTrigger>
          <TabsTrigger active={activeTab === "launcher"} onClick={() => setActiveTab("launcher")}>
            💻 Publicar Launcher
          </TabsTrigger>
          <TabsTrigger active={activeTab === "remote"} onClick={() => setActiveTab("remote")}>
            🌐 Servidor Remoto (Fuente de Verdad)
          </TabsTrigger>
          <TabsTrigger active={activeTab === "ftp"} onClick={() => setActiveTab("ftp")}>
            ⚙️ Conexión Servidor & FTP
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PUBLICACIÓN 1-CLIC */}
        <TabsContent active={activeTab === "publish"}>
          <Card>
            <CardHeader>
              <CardTitle>🚀 Publicar Nueva Versión del Juego</CardTitle>
              <CardDescription>
                Selecciona el juego y arrastra la carpeta de la nueva versión. El sistema calculará el parche diferencial y lo publicará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* JUEGO Y MÉTRICAS DE VERSIÓN */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div className="shadcn-form-group">
                  <label>Juego Seleccionado:</label>
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    disabled={isBuilding}
                  >
                    <option value="neo">Natural Elements Online (neo)</option>
                    <option value="juego1">Juego Demo 1 (juego1)</option>
                    <option value="juego2">Juego Demo 2 (juego2)</option>
                  </select>
                </div>

                <div className="shadcn-form-group">
                  <label>Estado de Versión Remota:</label>
                  <div style={{ padding: "0.65rem 0.875rem", backgroundColor: "#060911", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>En Servidor: </span>
                    <strong style={{ color: "#38bdf8" }}>v{currentVer}</strong>
                    <span style={{ margin: "0 0.5rem", color: "var(--border)" }}>|</span>
                    <span style={{ color: "var(--muted-foreground)" }}>Nueva a Publicar: </span>
                    <strong style={{ color: "#34d399" }}>v{nextVer}</strong>
                  </div>
                </div>
              </div>

              {/* DRAG & DROP ZONE */}
              <div
                className={`shadcn-dropzone ${isDragging ? "is-dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={handleSelectFolder}
              >
                <div className="drop-icon">📁</div>
                <h4 className="drop-text">
                  {newDir ? `Carpeta Seleccionada: ${newDir}` : "Arrastra aquí la carpeta de la nueva versión o haz clic para seleccionar"}
                </h4>
                <p className="drop-subtext">
                  {newDir ? "Haz clic para cambiar la carpeta seleccionada" : `O deja vacía para usar la convención automática workspace/${game}/next`}
                </p>
              </div>

              {/* PROGRESO DE CONSTRUCCIÓN */}
              {isBuilding && (
                <div style={{ marginTop: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span>{buildStep}</span>
                    <span>{buildProgress}%</span>
                  </div>
                  <Progress value={buildProgress} />
                </div>
              )}

              {/* OPCIONES DE GENERACIÓN */}
              <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", backgroundColor: "#060911", borderRadius: "0.5rem", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  id="full-client-check"
                  checked={generateFullClient}
                  onChange={(e) => setGenerateFullClient(e.target.checked)}
                  disabled={isBuilding}
                  style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }}
                />
                <label htmlFor="full-client-check" style={{ cursor: "pointer", fontSize: "0.9rem", color: "#f8fafc" }}>
                  📦 <strong>Generar también Cliente Completo v1 (client_v1.7z)</strong> para nuevos usuarios que no tengan el juego instalado.
                </label>
              </div>

              {/* BOTÓN GIGANTE PUBLICAR 1-CLIC */}
              <div style={{ marginTop: "1.25rem" }}>
                <Button
                  variant="success"
                  style={{ width: "100%" }}
                  disabled={isBuilding}
                  onClick={handleOneClickPublish}
                >
                  {isBuilding ? "⏳ Publicando Actualización..." : "🚀 PUBLICAR EN VIVO AL SERVIDOR REMOTO (1-CLICK)"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* LOGS DE EJECUCIÓN */}
          {logs.length > 0 && (
            <Card style={{ backgroundColor: "#04070d" }}>
              <CardHeader>
                <CardTitle style={{ fontSize: "0.95rem" }}>💻 Consola de Ejecución en Vivo</CardTitle>
              </CardHeader>
              <CardContent>
                <pre style={{
                  margin: 0,
                  padding: "1rem",
                  backgroundColor: "#000000",
                  borderRadius: "0.5rem",
                  color: "#4ade80",
                  fontSize: "0.85rem",
                  maxHeight: "220px",
                  overflowY: "auto",
                  fontFamily: "monospace"
                }}>
                  {logs.join("")}
                  <div ref={logEndRef} />
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB LAUNCHER: PUBLICAR NUEVO LAUNCHER (AUTO-UPDATE) */}
        <TabsContent active={activeTab === "launcher"}>
          <Card>
            <CardHeader>
              <CardTitle>💻 Publicar Nueva Versión del Launcher (Auto-Update)</CardTitle>
              <CardDescription>
                Empaqueta y publica el ejecutable del launcher en producción para que todos los jugadores se actualicen solos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div className="shadcn-form-group">
                  <label>Versión del Launcher a Publicar:</label>
                  <input
                    type="number"
                    value={launcherVersion}
                    onChange={(e) => setLauncherVersion(parseInt(e.target.value, 10) || 1)}
                    disabled={isBuilding}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                    Versión actual en servidor: v{remoteConfig?.launcherVer || 3}
                  </span>
                </div>

                <div className="shadcn-form-group">
                  <label>Ruta del Ejecutable (.exe):</label>
                  <input
                    type="text"
                    value={launcherExePath}
                    onChange={(e) => setLauncherExePath(e.target.value)}
                    placeholder="Deja vacío para usar 'dist/TudexLauncher.exe'"
                    disabled={isBuilding}
                  />
                </div>
              </div>

              {isBuilding && activeTab === "launcher" && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span>{buildStep}</span>
                    <span>{buildProgress}%</span>
                  </div>
                  <Progress value={buildProgress} />
                </div>
              )}

              <Button
                variant="success"
                style={{ width: "100%" }}
                disabled={isBuilding}
                onClick={handlePublishLauncher}
              >
                {isBuilding ? "⏳ Publicando Launcher..." : `🚀 PUBLICAR LAUNCHER v${launcherVersion} A PRODUCCIÓN (1-CLICK)`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SERVIDOR REMOTO (FUENTE DE VERDAD) */}
        <TabsContent active={activeTab === "remote"}>
          <Card>
            <CardHeader>
              <CardTitle>🌐 Diagnóstico del Servidor Remoto (Source of Truth)</CardTitle>
              <CardDescription>
                Información en tiempo real leída directamente desde <code>{remoteUrl}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", background: "#060911", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Estado del Servidor</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                    {remoteStatus === "online" ? "🟢 200 OK (En Línea)" : "🔴 Error de Conexión"}
                  </div>
                </div>

                <div style={{ padding: "1rem", background: "#060911", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Launcher Version Exigida</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginTop: "0.25rem", color: "#38bdf8" }}>
                    v{remoteConfig?.launcherVer || 1}
                  </div>
                </div>

                <div style={{ padding: "1rem", background: "#060911", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Última Sincronización</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                    {lastCheckTime || "No verificado"}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: "0 0 0.75rem 0", color: "#f8fafc" }}>🎮 Juegos Publicados en el Servidor Remoto:</h4>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Juego</TableHead>
                    <TableHead>Versión Cliente</TableHead>
                    <TableHead>Parches Publicados</TableHead>
                    <TableHead>Estado en Producción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remoteConfig && remoteConfig.games && remoteConfig.games.length > 0 ? (
                    remoteConfig.games.map((g, idx) => (
                      <TableRow key={idx}>
                        <TableCell style={{ fontWeight: "bold" }}>{g.name}</TableCell>
                        <TableCell>v{g.clientVer || 1}</TableCell>
                        <TableCell>{g.patchUrls ? g.patchUrls.length : 0} parches</TableCell>
                        <TableCell><Badge variant="success">● Publicado en Línea</Badge></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
                        No se obtuvieron juegos del servidor remoto o la conexión falló.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: AJUSTES DE CONEXIÓN Y FTP */}
        <TabsContent active={activeTab === "ftp"}>
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Configuración del Servidor y Credenciales FTP</CardTitle>
              <CardDescription>
                Ajustes de despliegue automático hacia tu servidor Apache / cPanel / VPS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="shadcn-form-group">
                <label>URL de Configuración Remota (Source of Truth):</label>
                <input
                  type="text"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                />
              </div>

              <div style={{ margin: "1.25rem 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ftpConfig.enabled}
                    onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, enabled: e.target.checked })}
                  />
                  <strong>Habilitar Subida Automática por FTP al generar parches</strong>
                </label>
              </div>

              {ftpConfig.enabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="shadcn-form-group">
                    <label>Servidor FTP (Host o IP):</label>
                    <input
                      type="text"
                      value={ftpConfig.host}
                      onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, host: e.target.value })}
                      placeholder="ftp.tudexnetworks.com"
                    />
                  </div>

                  <div className="shadcn-form-group">
                    <label>Puerto FTP:</label>
                    <input
                      type="text"
                      value={ftpConfig.port}
                      onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, port: e.target.value })}
                      placeholder="21"
                    />
                  </div>

                  <div className="shadcn-form-group">
                    <label>Usuario FTP:</label>
                    <input
                      type="text"
                      value={ftpConfig.user}
                      onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, user: e.target.value })}
                      placeholder="usuario_ftp"
                    />
                  </div>

                  <div className="shadcn-form-group">
                    <label>Contraseña FTP:</label>
                    <input
                      type="password"
                      value={ftpConfig.password}
                      onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="shadcn-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Directorio Remoto Servidor:</label>
                    <input
                      type="text"
                      value={ftpConfig.remoteDir}
                      onChange={(e) => handleSaveFtpConfig({ ...ftpConfig, remoteDir: e.target.value })}
                      placeholder="/public_html"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
