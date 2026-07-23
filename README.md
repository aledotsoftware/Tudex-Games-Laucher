# 🕹️ Tudex Games Launcher & Backend System

Sistema integral de distribución de juegos, empaquetado de parches diferenciales y auto-actualización para launcher y clientes de juegos.

## 📄 Guía Rápida de Comandos

Consulta la documentación detallada de comandos en:
👉 [COMMANDS.md](file:///p:/Tudex-Games-Laucher/electron-game-updater-main/COMMANDS.md)

---

## 🚀 Resumen de Flujo de Trabajo

### 1. Empaquetar Juego Nuevo (v1)
```bash
cd electron-game-updater-main
npm run build-patch -- --game juego1 --version 1 --new "C:\Juegos\Juego_v1"
```

### 2. Generar Parche de Actualización (v1 -> v2)
```bash
npm run build-patch -- --game juego1 --version 2 --from-version 1 --old "C:\Juegos\Juego_v1" --new "C:\Juegos\Juego_v2"
```

### 3. Publicar Nueva Versión del Launcher
```bash
npm run build-launcher -- --version 2 --exe "dist/TudexLauncher.exe"
```

### 4. Desplegar al Servidor Web
Sube todo el contenido de la carpeta `electron-game-updater-main/public_html` al directorio `public_html` de tu servidor web (Apache / cPanel / VPS).
