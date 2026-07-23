const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        version: null,
        exePath: null,
        baseUrl: 'http://localhost:8081',
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
    let webConfig = {
        updaterUrl: `${options.baseUrl}/config.json`,
        launcherVer: 1,
        launcherUrl: '',
        selectedGame: '',
        selectedLanguage: 'ES',
        games: []
    };

    if (fs.existsSync(configPath)) {
        try {
            webConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.warn('Existing config.json invalid, creating new configuration.');
        }
    }

    webConfig.launcherVer = options.version;
    webConfig.launcherUrl = `${options.baseUrl}/launcher/${fileName}`;
    webConfig.updaterUrl = `${options.baseUrl}/config.json`;

    fs.writeFileSync(configPath, JSON.stringify(webConfig, null, 4), 'utf8');

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
