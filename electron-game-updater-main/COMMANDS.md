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

### 2️⃣ Para abrir el programa visual de empaquetar y subir parches
Abre la pantalla gráfica donde seleccionas carpetas con botones (sin usar comandos):
```powershell
npm run dev:admin
```
📍 **Resultado:** Abre la aplicación **Patch Studio** para elegir tu juego, crear el parche y subirlo a tu servidor o FTP haciendo clic.

---

### 3️⃣ Para subir una actualización del Launcher a tu servidor
Cuando recompiles el launcher y quieras que a todos tus usuarios se les actualice solo:
```powershell
npm run build-launcher -- --version 2 --exe "dist/TudexLauncher.exe"
```
📍 **Resultado:** Copia el nuevo `.exe` a la carpeta web y actualiza `config.json` automáticamente para que todos se actualicen.


