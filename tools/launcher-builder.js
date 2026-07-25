const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        version: null,
        exePath: null,
        baseUrl: 'https://updates.tudexnetworks.com/tudexgames',
        outDir: path.resolve(process.cwd(), 'public_html')
    };

    const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : val;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if ((arg === '--version' || arg === '-v') && args[i + 1]) {
            options.version = parseInt(args[++i], 10);
        } else if ((arg === '--exe' || arg === '-e') && args[i + 1]) {
            options.exePath = path.resolve(clean(args[++i]));
        } else if (arg === '--base-url' && args[i + 1]) {
            options.baseUrl = clean(args[++i]).replace(/\/$/, '');
        } else if (arg === '--out' && args[i + 1]) {
            options.outDir = path.resolve(clean(args[++i]));
        }
    }

    return options;
}

function showHelp() {
    console.log(`
=====================================================
 Tudex Launcher Builder & Packaging Utility
=====================================================

Usage:
  npm run build-launcher -- [options]

Options:
  --version <num>           New launcher version number (REQUIRED)
  --exe <path>              Path to new launcher .exe / release binary (REQUIRED)
  --base-url <url>          Base URL of web server. Default: http://localhost:8081
  --out <path>              Output web directory. Default: ./public_html

Example:
  npm run build-launcher -- --version 2 --exe dist/win-unpacked/launcher.exe
=====================================================
`);
}

async function main() {
    const options = parseArgs();

    if (options.help || !options.version || !options.exePath) {
        showHelp();
        if (!options.help) {
            console.error('ERROR: --version and --exe arguments are required.\n');
            process.exit(1);
        }
        return;
    }

    if (!fs.existsSync(options.exePath)) {
        console.error(`ERROR: Executable file not found at: ${options.exePath}`);
        process.exit(1);
    }

    const launcherOutDir = path.join(options.outDir, 'launcher');
    fs.mkdirSync(launcherOutDir, { recursive: true });

    const fileName = `launcher_v${options.version}.exe`;
    const targetPath = path.join(launcherOutDir, fileName);

    console.log(`Copying launcher binary to: ${targetPath}`);
    fs.copyFileSync(options.exePath, targetPath);

    const configPath = path.join(options.outDir, 'config.json');
    const configCandidates = [
        configPath,
        path.resolve(process.cwd(), '..', 'tudex-backend', 'config.json'),
        path.resolve(process.cwd(), 'tudex-backend', 'config.json'),
        path.resolve(process.cwd(), 'public_html', 'config.json')
    ];

    let webConfig = {
        updaterUrl: `${options.baseUrl}/config.json`,
        launcherVer: 1,
        launcherUrl: '',
        selectedGame: '',
        selectedLanguage: 'ES',
        games: []
    };

    for (const cand of configCandidates) {
        if (fs.existsSync(cand)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(cand, 'utf8'));
                if (parsed && Array.isArray(parsed.games) && parsed.games.length > 0) {
                    webConfig = parsed;
                    console.log(`Preserving existing games configuration from: ${cand}`);
                    break;
                } else if (parsed && parsed.launcherVer) {
                    webConfig = parsed;
                }
            } catch (e) {
                // Continue searching
            }
        }
    }

    webConfig.launcherVer = options.version;
    webConfig.launcherUrl = `${options.baseUrl}/launcher/${fileName}`;
    webConfig.updaterUrl = `${options.baseUrl}/config.json`;

    // Ensure all game URLs match baseUrl and include proper /games/ subpath
    if (webConfig.games && Array.isArray(webConfig.games)) {
        webConfig.games.forEach(game => {
            if (game.clientUrl) {
                game.clientUrl = game.clientUrl
                    .replace(/^http:\/\/localhost:\d+/i, options.baseUrl)
                    .replace(/\/tudexgames\/neo\//g, '/tudexgames/games/neo/');
            }
            if (game.clientChunks && Array.isArray(game.clientChunks)) {
                game.clientChunks = game.clientChunks.map(url =>
                    url.replace(/^http:\/\/localhost:\d+/i, options.baseUrl)
                       .replace(/\/tudexgames\/neo\//g, '/tudexgames/games/neo/')
                );
            }
            if (game.patchUrls && Array.isArray(game.patchUrls)) {
                game.patchUrls = game.patchUrls.map(url =>
                    url.replace(/^http:\/\/localhost:\d+/i, options.baseUrl)
                       .replace(/\/tudexgames\/neo\//g, '/tudexgames/games/neo/')
                );
            }
        });
    }

    fs.writeFileSync(configPath, JSON.stringify(webConfig, null, 4), 'utf8');
    
    const rootBackendConfig = path.resolve(process.cwd(), '..', 'tudex-backend', 'config.json');
    if (fs.existsSync(rootBackendConfig)) {
        fs.writeFileSync(rootBackendConfig, JSON.stringify(webConfig, null, 4), 'utf8');
    }

    console.log(`
=====================================================
 SUCCESS! Launcher Version ${options.version} Packaged
=====================================================
 Output Executable: ${targetPath}
 Launcher URL: ${webConfig.launcherUrl}
 Updated Config: ${configPath}

 Upload the entire "${options.outDir}" directory to public_html.
=====================================================
`);
}

main().catch(err => {
    console.error('Build launcher failed:', err);
    process.exit(1);
});
