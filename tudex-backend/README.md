# Tudex Games Backend

Backend completo para la plataforma **Tudex Games Launcher**.

## Servicios incluidos

| Servicio | Descripción | Puerto interno |
|----------|-------------|----------------|
| **nginx** | Proxy reverso + servidor de archivos estáticos | 80, 443 |
| **api** | API REST (Node.js + Express) | 3000 |
| **panel** | Panel de administración (React + Vite) | 4173 |
| **db** | Base de datos PostgreSQL | 5432 |

## Puesta en marcha

### 1. Clonar y configurar

```bash
cp .env.example .env
```

Edita `.env` y cambia:
- `BASE_URL` → tu dominio real (ej: `https://launcher.tudexgames.com`)
- `JWT_SECRET` → una cadena aleatoria segura
- `DB_PASS` → contraseña segura para la base de datos

> **Importante:** actualiza también la contraseña en `docker-compose.yml` para que coincida con `DB_PASS`.

### 2. Levantar los contenedores

```bash
docker compose up -d --build
```

### 3. Setup inicial del administrador

Abre en el navegador: `http://tu-servidor/setup`

Crea tu cuenta de administrador y listo.

### 4. Conectar el Launcher

En el archivo del launcher `src/constants/index.js`:
```js
export const DEFAULT_CONFIG = {
  updaterUrl: "https://launcher.tudexgames.com/api/config",
  ...
};
```

## Endpoints de la API

### Públicos (sin autenticación)
- `GET /api/config` — JSON de configuración que consume el launcher
- `GET /api/health` — Estado de salud de la API
- `GET /api/launcher/version` — Versión actual del launcher

### Autenticados (requieren JWT)
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Datos del usuario actual
- `GET /api/games` — Listar juegos
- `GET /api/games/:name` — Ver juego con parches y voice packs
- `POST /api/games` — Crear juego
- `PUT /api/games/:name` — Actualizar info del juego
- `PATCH /api/games/:name/maintenance` — Toggle mantenimiento
- `POST /api/games/:name/client` — Subir cliente .7z
- `POST /api/games/:name/patch` — Agregar parche .7z
- `POST /api/games/:name/icon` — Subir ícono
- `POST /api/games/:name/background` — Subir fondo
- `POST /api/games/:name/voicepacks` — Configurar voice packs
- `DELETE /api/games/:name` — Eliminar juego

### Admin only
- `POST /api/launcher/upload` — Publicar nueva versión del launcher
- `POST /api/auth/register` — Registrar nuevo usuario
- `GET /api/launcher/versions` — Historial de versiones

## Estructura del JSON para el Launcher

El endpoint `/api/config` genera automáticamente:

```json
{
  "launcherVer": 2,
  "launcherUrl": "https://launcher.tudexgames.com/uploads/launcher/TudexGamesLauncher.exe",
  "games": [
    {
      "name": "mi-juego",
      "startCmd": "start mi-juego.exe EGULANG",
      "clientVer": 3,
      "clientUrl": "https://launcher.tudexgames.com/uploads/games/mi-juego/client-v3.7z",
      "patchUrls": [
        "https://launcher.tudexgames.com/uploads/games/mi-juego/patch-1.7z"
      ],
      "maintenance": false,
      "iconUrl": "https://launcher.tudexgames.com/uploads/icons/mi-juego.png",
      "backgroundUrl": "https://launcher.tudexgames.com/uploads/backgrounds/mi-juego.jpg",
      "voicePacks": [
        { "value": "EN", "label": "English" },
        { "value": "ES", "label": "Español" }
      ]
    }
  ]
}
```

## Comandos útiles

```bash
# Ver logs
docker compose logs -f api

# Reiniciar un servicio
docker compose restart api

# Acceder a la base de datos
docker compose exec db psql -U tudex -d tudex_launcher

# Parar todo
docker compose down

# Parar y eliminar datos (¡cuidado!)
docker compose down -v
```
