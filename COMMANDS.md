# ⚡ Resumen Único: Los Únicos 3 Comandos Que Necesitas

No necesitas aprender decenas de comandos. Aquí están los **únicos 3 comandos** que usarás en el día a día:

---

### 1️⃣ Para generar el archivo `.exe` del juego (para los jugadores)
Compila el archivo ejecutable que le envías a tus jugadores:
```powershell
npm run build:player
```
📍 **Resultado:** Encuentras tu archivo `TudexLauncher.exe` dentro de la carpeta `dist/`.

---

### 2️⃣ Para empaquetar y subir parches automáticamente (Modo Rápido / 1-Click)
#### Opción A: Desde la Consola (1 Solo Comando)
Coloca tu nueva build en `workspace/neo/next` y ejecuta:
```powershell
npm run update neo
```
📍 **Resultado:** Deduce la versión actual, genera el parche diferencial, actualiza `workspace/neo/current` y sube los volúmenes automáticamente por FTP.

#### Opción B: Desde el Programa Visual (Drag & Drop)
Abre la pantalla gráfica donde puedes arrastrar carpetas o hacer clic en 1 botón:
```powershell
npm run dev:admin
```
📍 **Resultado:** Abre la aplicación **Patch Studio** con zona Drag & Drop para subir actualizaciones en 1 clic.

---

### 3️⃣ Para generar el archivo `.exe` del juego (para los jugadores)
Compila el archivo ejecutable que le envías a tus jugadores:
```powershell
npm run build:player
```
📍 **Resultado:** Encuentras tu archivo `TudexLauncher.exe` dentro de la carpeta `dist/`.

---

### 4️⃣ Para subir una actualización del Launcher a tu servidor
Cuando recompiles el launcher y quieras que a todos tus usuarios se les actualice solo:
```powershell
npm run build-launcher -- --version 2 --exe "dist/TudexLauncher.exe"
```
📍 **Resultado:** Copia el nuevo `.exe` a la carpeta web y actualiza `config.json` automáticamente para que todos se actualicen.


