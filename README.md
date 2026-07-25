# 🚀 Base de Conocimiento - Tudex Games Launcher & Patch Studio

Bienvenido a la **Base de Conocimiento y Documentación Técnica** de **Tudex Games Launcher & Patch Studio**.

Esta plataforma es una solución integral de distribución, actualización automática y empaquetado de videojuegos para Windows, construida sobre **Electron**, **React** y **Node.js**. El proyecto cuenta con una arquitectura dual dividida en dos aplicaciones independientes:

1. **Tudex Games Launcher (`TudexLauncher.exe`)**: Aplicación distribuible orientada al cliente/jugador final.
2. **Tudex Patch Studio (`TudexPatchStudio.exe`)**: Herramienta de administración y empaquetado en 1-Clic para desarrolladores.

---

## 📐 Arquitectura Tecnológica y Stack

- **Core Runtime**: [Electron v23.3.13](file:///p:/Tudex-Games-Laucher/package.json#L36) con soporte para ejecutable portable.
- **Frontend & UI**: [React v18.3.1](file:///p:/Tudex-Games-Laucher/package.json#L28) + SCSS modular con diseño Shadcn/UI en modo Admin.
- **Bundler & Build Tooling**: [electron-webpack v2.8.2](file:///p:/Tudex-Games-Laucher/package.json#L38) + Webpack 4 + Babel.
- **Compresión & Archivos**: Binario nativo [7zip-bin](file:///p:/Tudex-Games-Laucher/package.json#L24) y envoltorio [node-7z](file:///p:/Tudex-Games-Laucher/package.json#L27).
- **Gestión de Descargas**: [electron-dl v3.5.2](file:///p:/Tudex-Games-Laucher/package.json#L26) con soporte para progreso en tiempo real, pausa, reanudación y cancelación.
- **Despliegue Remoto**: [basic-ftp v6.0.1](file:///p:/Tudex-Games-Laucher/package.json#L25) para subidas automatizadas a servidores web FTP/SFTP.
- **Internacionalización**: Custom i18n con [React-Intl](file:///p:/Tudex-Games-Laucher/package.json#L30) (Español, Inglés, Portugués, Chino Taiwán).

---

## 🎮 1. Tudex Games Launcher (Modo Jugador)

El launcher del jugador final ([src/renderer/mainWindow.js](file:///p:/Tudex-Games-Laucher/src/renderer/mainWindow.js)) gestiona todo el ciclo de vida del juego, desde la instalación inicial hasta las actualizaciones diferenciales y el lanzamiento ejecutable.

### 🔑 Características Principales:

#### 1.1. Soporte Multijuego
- Permite albergar múltiples juegos en una única interfaz.
- Barral lateral dinámico con iconos personalizables ([src/renderer/mainWindow.js:221-236](file:///p:/Tudex-Games-Laucher/src/renderer/mainWindow.js#L221-L236)) e imágenes de fondo dinámicas para cada título.
- Selección persistente del último juego activo mediante [launcher-config.json](file:///p:/Tudex-Games-Laucher/launcher-config.json).

#### 1.2. Auto-Actualización del Launcher (Self-Updater)
- Al iniciar, el launcher consulta el archivo remoto `config.json` ([src/renderer/utils/validateAndFetchConfig.js](file:///p:/Tudex-Games-Laucher/src/renderer/utils/validateAndFetchConfig.js)).
- Si `configRemote.launcherVer > configLocal.launcherVer`, inicia la descarga del nuevo ejecutable (`.exe.new`).
- Tras descargar el binario, genera y ejecuta un script de reemplazo atómico `launcher-update.bat` ([src/renderer/initialSetup.js:93-134](file:///p:/Tudex-Games-Laucher/src/renderer/initialSetup.js#L93-L134)) que cierra el proceso actual, reemplaza el ejecutable anterior y reinicia la aplicación actualizada.

#### 1.3. Descarga Inteligente y Soporte para Volúmenes Divididos (Chunking)
- Soporta la descarga de juegos divididos en múltiples volúmenes 7z (`.7z.001`, `.7z.002`, etc.) definidos en `clientChunks` ([src/renderer/gamesPatch.js:157-173](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L157-L173)).
- Control total del flujo de descarga: **Pausar**, **Reanudar** y **Cancelar** desde la interfaz principal ([src/renderer/gamesPatch.js:101-136](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L101-L136)).
- Métrica precisa en tiempo real: cálculo de velocidad de descarga (MB/s), MB transferidos vs MB totales, porcentaje y tiempo restante estimado con suavizado exponencial ([src/renderer/utils/showDownloadProgress.js](file:///p:/Tudex-Games-Laucher/src/renderer/utils/showDownloadProgress.js)).

#### 1.4. Actualizaciones Diferenciales Incrementales (Parches)
- Compara la versión local del juego (`patchVer`) con el arreglo de parches remotos (`patchUrls`).
- Aplica los parches requeridos de forma acumulativa y secuencial (`patch_v1_to_v2.7z`, `patch_v2_to_v3.7z`, etc.) ([src/renderer/gamesPatch.js:295-426](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L295-L426)).
- Elimina automáticamente los archivos comprimidos temporales una vez completada la extracción para ahorrar espacio en disco.

#### 1.5. Extracción NHP 7-Zip Directa
- Integración nativa con `7za.exe` a través de IPC en Electron ([src/renderer/utils/extract7zFile.js](file:///p:/Tudex-Games-Laucher/src/renderer/utils/extract7zFile.js)).
- Muestra el progreso real de descompresión (0% a 100%) directamente en la barra de interfaz.

#### 1.6. Sistema de Verificación de Integridad y Reparación Automática
- Revisa que la carpeta del juego y el ejecutable principal existan y tengan un tamaño válido ([src/renderer/gamesPatch.js:428-474](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L428-L474)).
- Si la configuración remota incluye un `manifest` de archivos con hashes SHA-256, se valida cada archivo cliente contra dicho manifiesto.
- Si se detecta corrupción o eliminación de archivos, el launcher cambia el botón a **"Reparar"**, limpiando la versión corrupta y realizando una instalación limpia ([src/renderer/gamesPatch.js:567-588](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L567-L588)).

#### 1.7. Internacionalización (i18n) y Selección de Idioma
- Interfaz multilingüe compatible con 4 idiomas ([src/constants/index.js:10-39](file:///p:/Tudex-Games-Laucher/src/constants/index.js#L10-L39)):
  - 🇺🇸 English (`EN`)
  - 🇪🇸 Español (`ES`)
  - 🇧🇷 Portugués (`PT`)
  - 🇹🇼 中文 Taiwán (`TW`)
- Actualización dinámica instantánea de textos en UI sin necesidad de reiniciar la aplicación ([src/renderer/mainWindow.js:116-148](file:///p:/Tudex-Games-Laucher/src/renderer/mainWindow.js#L116-L148)).

#### 1.8. Paquetes de Voz (Voice Packs) e Inyección Dinámica de Parámetros (`EGULANG`)
- Soporte para paquetes de voz específicos por juego (`voicePacks`).
- Filtrado automático de paquetes de voz válidos según el idioma UI seleccionado ([src/renderer/utils/filterVoicePackOptions.js](file:///p:/Tudex-Games-Laucher/src/renderer/utils/filterVoicePackOptions.js)).
- Reemplazo automático del comodín `EGULANG` en el comando de ejecución (`startCmd`):
  - Ejemplo sin voz seleccionada: `"start game.exe EGULANG"` ➔ `"start game.exe ES"`
  - Ejemplo con voz seleccionada: `"start game.exe EGULANG"` ➔ `"start game.exe ES_KR"` ([src/renderer/gamesPatch.js:528-536](file:///p:/Tudex-Games-Laucher/src/renderer/gamesPatch.js#L528-L536)).

#### 1.9. Modo Mantenimiento por Juego (`maintenance: true`)
- Deshabilita de forma independiente el botón "Jugar" o "Instalar" de un juego específico sin afectar a los demás ([src/renderer/mainWindow.js:351-356](file:///p:/Tudex-Games-Laucher/src/renderer/mainWindow.js#L351-L356)).

---

## 🛠️ 2. Tudex Patch Studio (Modo Administrador - Enterprise v2.0)

Se activa mediante `npm run dev:admin` o el ejecutable `TudexPatchStudio.exe`. Ofrece una suite gráfica profesional basada en **Shadcn UI** ([src/renderer/AdminStudioApp.js](file:///p:/Tudex-Games-Laucher/src/renderer/AdminStudioApp.js)) para empaquetar y publicar actualizaciones con un solo clic.

### 🔑 Funcionalidades del Estudio de Administración:

#### 2.1. Panel Dashboard y Diagnóstico de Servidor Remoto
- Conexión en vivo con el servidor remoto (Source of Truth) definido en `remoteUrl`.
- Indicador visual del estado del servidor (`🟢 En Línea` / `🔴 Desconectado` / `⏳ Verificando`).
- Visualización en tiempo real de versiones actuales y número de parches publicados por cada juego ([src/renderer/AdminStudioApp.js:462-525](file:///p:/Tudex-Games-Laucher/src/renderer/AdminStudioApp.js#L462-L525)).

#### 2.2. Publicación de Juegos en 1-Clic (Drag & Drop)
- Zona de **Drag & Drop** para arrastrar directamente la carpeta de la nueva versión del juego ([src/renderer/AdminStudioApp.js:321-335](file:///p:/Tudex-Games-Laucher/src/renderer/AdminStudioApp.js#L321-L335)).
- Uso por convención automática de carpetas workspace:
  - Versión actual online: `workspace/{game}/current`
  - Nueva versión a publicar: `workspace/{game}/next`
- Opción para generar simultáneamente el cliente completo base (`client_v1.7z`) para usuarios nuevos.

#### 2.3. Motor de Análisis Diferencial y Compresión CLI (`patch-builder.js`)
- Algoritmo de comparación recursiva de archivos entre la versión previa y la nueva ([tools/patch-builder.js:236-273](file:///p:/Tudex-Games-Laucher/tools/patch-builder.js#L236-L273)).
- Calculador de hashes SHA-256 por bloques de 64MB compatibles con archivos mayores a 2GB ([tools/patch-builder.js:107-123](file:///p:/Tudex-Games-Laucher/tools/patch-builder.js#L107-L123)).
- División automática en volúmenes comprimidos de 7-Zip (por defecto volúmenes de 50MB: `-v50m`).
- Generación automática del manifiesto de integridad SHA-256 (`manifest`) de la nueva versión para verificación contra corrupción.
- Promoción automática de directorios tras la compilación exitosa (`next` pasa a ser el nuevo `current`).

#### 2.4. Publicación del Launcher Ejecutable (`launcher-builder.js`)
- Compila automáticamente el código del launcher (`npm run build:player`).
- Empaqueta la nueva versión binaria (`launcher_vX.exe`) en la estructura del servidor web (`public_html/launcher/`).
- Actualiza `launcherVer` y `launcherUrl` en el archivo `config.json` para desencadenar el proceso de auto-actualización de los jugadores ([tools/launcher-builder.js:114-146](file:///p:/Tudex-Games-Laucher/tools/launcher-builder.js#L114-L146)).

#### 2.5. Subida Automática por FTP / SFTP (`ftp-uploader.js`)
- Integración nativa con `basic-ftp` ([tools/ftp-uploader.js](file:///p:/Tudex-Games-Laucher/tools/ftp-uploader.js)).
- Sincroniza la carpeta local [public_html](file:///p:/Tudex-Games-Laucher/public_html) hacia el directorio remoto de tu servidor Apache / cPanel / Nginx (`/public_html` o subcarpeta).
- Persistencia de credenciales FTP en [patch-studio-settings.json](file:///p:/Tudex-Games-Laucher/patch-studio-settings.json).

---

## ⚙️ 3. Esquema del Archivo de Configuración Remoto (`config.json`)

El archivo `config.json` alojado en tu servidor web actúa como la **Fuente Única de Verdad** para todos los launchers clientes:

```json
{
    "updaterUrl": "https://updates.tudexnetworks.com/tudexgames/config.json",
    "launcherVer": 2,
    "launcherUrl": "https://updates.tudexnetworks.com/tudexgames/launcher/launcher_v2.exe",
    "selectedGame": "neo",
    "selectedLanguage": "ES",
    "games": [
        {
            "name": "neo",
            "startCmd": "start NaturalElementsOnline.exe EGULANG",
            "clientVer": 1,
            "clientUrl": "https://updates.tudexnetworks.com/tudexgames/games/neo/client_v1.7z.001",
            "clientChunks": [
                "https://updates.tudexnetworks.com/tudexgames/games/neo/client_v1.7z.001",
                "https://updates.tudexnetworks.com/tudexgames/games/neo/client_v1.7z.002"
            ],
            "patchVer": 2,
            "patchUrls": [
                "https://updates.tudexnetworks.com/tudexgames/games/neo/patch_v0_to_v1.7z",
                "https://updates.tudexnetworks.com/tudexgames/games/neo/patch_v1_to_v2.7z"
            ],
            "maintenance": false,
            "iconUrl": "https://updates.tudexnetworks.com/tudexgames/assets/neo-icon.png",
            "backgroundUrl": "https://updates.tudexnetworks.com/tudexgames/assets/neo-bg.jpg",
            "voicePacks": [
                { "value": "EN", "label": "English Voice" },
                { "value": "PT", "label": "Português Voice" },
                { "value": "KR", "label": "한국어 (Korean)" }
            ],
            "manifest": {
                "bin/game.dll": {
                    "size": 1048576,
                    "hash": "a1b2c3d4e5f6..."
                }
            }
        }
    ]
}
```

### Explicación del Esquema:
- `launcherVer`: Número de versión actual del launcher ejecutable.
- `launcherUrl`: URL de descarga del `.exe` de actualización del launcher.
- `startCmd`: Comando de consola para ejecutar el juego. Admite la etiqueta `EGULANG`.
- `clientVer`: Versión base del paquete ejecutable completo.
- `clientChunks`: Arreglo de URLs con las partes divididas en volúmenes de 50MB.
- `patchVer`: Número actual de parche aplicado.
- `patchUrls`: Arreglo ordenado con las URLs de los parches diferenciales acumulativos.
- `maintenance`: Si se establece en `true`, deshabilita el juego en todos los clientes.
- `voicePacks`: Lista de opciones de audio de voz disponibles para el juego.
- `manifest`: Mapeo de rutas relativas con tamaño en bytes y hash SHA-256 para verificación de integridad.

---

## ⚡ 4. Guía de Comandos CLI (Scripts de Desarrollador)

Todos los comandos se ejecutan desde la consola de comandos de Node.js / PowerShell:

### 1️⃣ Compilar el Launcher para Jugadores
Genera el ejecutable listo para distribuir a los usuarios finales:
```powershell
npm run build:player
```
📍 **Resultado:** Crea el archivo `dist/TudexLauncher.exe`.

### 2️⃣ Iniciar Patch Studio (Modo Visual Administrador)
Abre la interfaz gráfica Shadcn para empaquetado y subida FTP en 1-Clic:
```powershell
npm run dev:admin
```

### 3️⃣ Publicación Rápida de Juego por Consola (Fast Update)
Procesa la versión en `workspace/{game}/next`, calcula el parche contra `current`, actualiza la configuración y sube por FTP:
```powershell
npm run update -- --game neo
```
*Opciones adicionales:*
- `--source "C:/Ruta/NuevaVersion"`: Especifica una carpeta externa.
- `--no-ftp`: Genera las actualizaciones en `public_html/` pero omite la subida FTP.
- `--full-client`: Genera también el cliente completo `client_v1.7z`.

### 4️⃣ Publicar Nueva Versión del Launcher
Compila y registra una nueva versión ejecutable del Launcher en el servidor:
```powershell
npm run build-launcher -- --version 2 --exe "dist/TudexLauncher.exe"
```

### 5️⃣ Compilar Versión Ejecutable de Patch Studio (Admin Portable)
```powershell
npm run build:admin
```
📍 **Resultado:** Crea el ejecutable `dist/TudexPatchStudio.exe`.

---

## 📁 5. Estructura del Código Fuente

```text
Tudex-Games-Laucher/
├── COMMANDS.md                       # Resumen rápido de comandos de consola
├── README.md                         # Base de Conocimiento y Documentación General
├── package.json                      # Scripts, dependencias y configuración de Electron Builder
├── patch-studio-settings.json        # Ajustes guardados de Patch Studio (FTP e Historial)
├── public_html/                      # Directorio de salida preparado para servidor web
│   ├── config.json                   # Fuente remota de verdad para los lanzadores
│   ├── games/                        # Archivos comprimidos de parches y clientes
│   └── launcher/                     # Ejecutables de actualización del launcher
├── src/
│   ├── constants/index.js            # Idiomas, mapeos de locales y configuraciones por defecto
│   ├── locales/                      # Archivos JSON de traducción (en, es, pt, tw)
│   ├── main/
│   │   ├── index.js                  # Proceso Principal Electron (IPC handlers, descargas, 7z)
│   │   └── mainWindow.js             # Creación de ventana BrowserWindow (Admin vs Jugador)
│   ├── renderer/
│   │   ├── AdminStudioApp.js         # Interfaz Shadcn UI de Patch Studio (Admin)
│   │   ├── mainWindow.js             # Interfaz Principal del Launcher (Jugador)
│   │   ├── gamesPatch.js             # Lógica central de parches, descargas, verificación e inicio
│   │   ├── initialSetup.js           # Auto-actualizador del launcher y script batch
│   │   ├── components/               # Componentes UI (Modales, Tablas, Botones, Badges)
│   │   └── utils/                    # Utilidades de descarga, i18n, 7z y alertas
│   └── utils/i18n.js                 # Gestor de internacionalización
├── tools/
│   ├── fast-update.js                # Script CLI de actualización rápida 1-clic
│   ├── patch-builder.js              # Generador de parches diferenciales y hashing SHA-256
│   ├── launcher-builder.js           # Empaquetador y publicador de versión de launcher
│   ├── ftp-uploader.js               # Módulo de subida por FTP con basic-ftp
│   └── settings-manager.js           # Gestor de lectura/escritura de configuraciones de administración
└── workspace/                        # Convención de trabajo local de versiones
    └── {game}/
        ├── current/                  # Copia local de la versión online actual
        └── next/                     # Carpeta donde depositas los archivos de la nueva versión
```

---

## ⚖️ Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](file:///p:/Tudex-Games-Laucher/LICENSE) para más detalles.
