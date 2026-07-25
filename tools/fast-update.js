const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { loadSettings, updateGameHistory } = require('./settings-manager');
const { uploadPublicHtml } = require('./ftp-uploader');

function parseArgs() {
    const args = process.argv.slice(2);
    let game = 'neo';
    let sourcePath = null;
    let autoFtp = true;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--game' && args[i + 1]) {
            game = args[++i].replace(/^"|"$/g, '').trim();
        } else if (arg === '--source' && args[i + 1]) {
            sourcePath = path.resolve(args[++i].replace(/^"|"$/g, '').trim());
        } else if (arg === '--no-ftp') {
            autoFtp = false;
        } else if (arg === '--full-client' || arg === '--build-client') {
            fullClient = true;
        } else if (!arg.startsWith('-') && i === 0) {
            game = arg.replace(/^"|"$/g, '').trim();
        }
    }

    return { game, sourcePath, autoFtp, fullClient };
}

async function fastUpdate() {
    const { game, sourcePath, autoFtp } = parseArgs();

    console.log(`\n=====================================================`);
    console.log(`🚀 Tudex Fast-Update Workflow`);
    console.log(`=====================================================`);
    console.log(`Juego: ${game}`);

    const workspaceDir = path.resolve(process.cwd(), 'workspace', game);
    const currentDir = path.join(workspaceDir, 'current');
    const nextDir = path.join(workspaceDir, 'next');

    // Ensure workspace directories exist
    fs.mkdirSync(currentDir, { recursive: true });
    fs.mkdirSync(nextDir, { recursive: true });

    // If a source path was provided, copy it to nextDir
    if (sourcePath) {
        if (!fs.existsSync(sourcePath)) {
            console.error(`❌ La ruta especificada en --source no existe: ${sourcePath}`);
            process.exit(1);
        }
        console.log(`📋 Copiando archivos desde ${sourcePath} -> ${nextDir}...`);
        fs.rmSync(nextDir, { recursive: true, force: true });
        fs.mkdirSync(nextDir, { recursive: true });
        fs.cpSync(sourcePath, nextDir, { recursive: true });
    }

    // Validate that nextDir has content
    const nextFiles = fs.readdirSync(nextDir);
    if (nextFiles.length === 0) {
        console.error(`\n❌ Error: La carpeta de la nueva versión está vacía.`);
        console.error(`📍 Por favor coloca los nuevos archivos del juego en:`);
        console.error(`   ${nextDir}`);
        console.error(`o ejecuta: npm run update -- --game ${game} --source "C:/Ruta/A/Tu/Nueva/Version"`);
        process.exit(1);
    }

    // Determine current version and target version
    const settings = loadSettings();
    const gameHistory = settings.games ? settings.games[game] : null;

    let currentVersion = 0;
    if (gameHistory && gameHistory.lastVersion) {
        currentVersion = gameHistory.lastVersion;
    } else {
        const configPath = path.resolve(process.cwd(), 'public_html', 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const webConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const gConf = (webConfig.games || []).find(g => g.name === game);
                if (gConf) {
                    currentVersion = (gConf.patchUrls && gConf.patchUrls.length > 0)
                        ? gConf.patchUrls.length
                        : (gConf.clientVer || 0);
                }
            } catch (e) {}
        }
    }

    const hasCurrentVersion = fs.existsSync(currentDir) && fs.readdirSync(currentDir).length > 0;
    const targetVersion = currentVersion === 0 ? 1 : currentVersion + 1;
    const isDifferential = hasCurrentVersion;

    console.log(`Versión actual detectada: v${currentVersion}`);
    console.log(`Objetivo: Generar v${targetVersion} (${isDifferential ? 'Parche Diferencial v' + currentVersion + ' -> v' + targetVersion : 'Full Client v1'})`);
    console.log(`Directorio actual (Online): ${isDifferential ? currentDir : '(Ninguno - Full Client)'}`);
    console.log(`Directorio nuevo (Next): ${nextDir}`);

    // Build arguments for patch-builder.js
    const patchBuilderScript = path.resolve(__dirname, 'patch-builder.js');
    const builderArgs = [
        patchBuilderScript,
        '--game', game,
        '--new', nextDir,
        '--version', String(targetVersion),
        '--promote'
    ];

    if (isDifferential) {
        builderArgs.push('--old', currentDir);
        builderArgs.push('--from-version', String(currentVersion));
    }

    if (fullClient) {
        builderArgs.push('--full-client');
    }

    console.log(`\n📦 Ejecutando compilador de parches...`);

    await new Promise((resolve, reject) => {
        const child = execFile('node', builderArgs, { cwd: process.cwd() });
        child.stdout.on('data', data => process.stdout.write(data));
        child.stderr.on('data', data => process.stderr.write(data));
        child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`patch-builder finalizó con código de error ${code}`));
        });
    });

    // Update settings history
    updateGameHistory(game, targetVersion, currentDir);

    // FTP Upload if enabled
    const ftpConfig = settings.ftp;
    if (autoFtp && ftpConfig && ftpConfig.enabled && ftpConfig.host) {
        console.log(`\n📡 Subiendo automáticamente al servidor FTP (${ftpConfig.host})...`);
        const publicHtmlDir = path.resolve(process.cwd(), 'public_html');
        await uploadPublicHtml(ftpConfig, publicHtmlDir, msg => console.log(msg));
    } else if (autoFtp && (!ftpConfig || !ftpConfig.enabled)) {
        console.log(`\n💡 Nota: FTP no configurado o deshabilitado en patch-studio-settings.json. Los archivos se generaron en public_html/`);
    }

    console.log(`\n=====================================================`);
    console.log(`🎉 ¡ACTUALIZACIÓN RÁPIDA COMPLETADA CON ÉXITO!`);
    console.log(`   - Juego: ${game}`);
    console.log(`   - Versión enviada: v${targetVersion}`);
    console.log(`   - Carpeta online actualizada: workspace/${game}/current`);
    console.log(`=====================================================\n`);
}

fastUpdate().catch(err => {
    console.error('\n❌ Fast Update falló:', err.message);
    process.exit(1);
});
