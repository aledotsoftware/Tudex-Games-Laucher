# Tudex Games Web Server (Apache Docker)

Servidor web estático Apache en Docker para alojar los parches diferenciales (`.7z`), clientes divididos y la configuración `config.json` generados por **Tudex Patch Studio**.

## Puesta en marcha

### 1. Levantar el servidor Apache Web
```bash
docker compose up -d
```

### 2. Contenido Servido
El contenedor de Apache sirve automáticamente todo el contenido del directorio `tudex-backend`:
- `http://localhost:8081/config.json`
- `http://localhost:8081/games/<nombre_juego>/client_v1.7z.001` ... `.N`
- `http://localhost:8081/games/<nombre_juego>/patch_v1_to_v2.7z`
- `http://localhost:8081/launcher/launcher_v1.exe`
