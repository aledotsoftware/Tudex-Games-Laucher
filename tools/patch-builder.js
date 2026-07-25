const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { path7za } = require('7zip-bin');

/**
 * Utility to parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        game: 'juego1',
        newDir: null,
        oldDir: null,
        version: 1,
        fromVersion: null,
        baseUrl: 'https://updates.tudexnetworks.com/tudexgames',
        outDir: path.resolve(process.cwd(), 'public_html'),
        volumeSize: '50m',
        promote: false
    };

    const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : val;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--game' && args[i + 1]) {
            options.game = clean(args[++i]);
        } else if (arg === '--new' && args[i + 1]) {
            options.newDir = path.resolve(clean(args[++i]));
        } else if (arg === '--old' && args[i + 1]) {
            options.oldDir = path.resolve(clean(args[++i]));
        } else if ((arg === '--version' || arg === '--to-version') && args[i + 1]) {
            options.version = parseInt(args[++i], 10);
        } else if (arg === '--from-version' && args[i + 1]) {
            options.fromVersion = parseInt(args[++i], 10);
        } else if (arg === '--base-url' && args[i + 1]) {
            options.baseUrl = clean(args[++i]).replace(/\/$/, '');
        } else if (arg === '--out' && args[i + 1]) {
            options.outDir = path.resolve(clean(args[++i]));
        } else if (arg === '--volume-size' && args[i + 1]) {
            options.volumeSize = clean(args[++i]);
        } else if (arg === '--promote') {
            options.promote = true;
        } else if (arg === '--full-client' || arg === '--build-client') {
            options.fullClient = true;
        }
    }

    // Convention fallback for workspace directory structure
    const workspaceGameDir = path.resolve(process.cwd(), 'workspace', options.game);
    if (!options.newDir) {
        const defaultNext = path.join(workspaceGameDir, 'next');
        if (fs.existsSync(defaultNext)) {
            options.newDir = defaultNext;
        }
    }

    if (!options.oldDir) {
        const defaultCurrent = path.join(workspaceGameDir, 'current');
        if (fs.existsSync(defaultCurrent)) {
            options.oldDir = defaultCurrent;
        }
    }

    if (!options.fromVersion && options.version > 1) {
        options.fromVersion = options.version - 1;
    }

    return options;
}

function showHelp() {
    console.log(`
=====================================================
 Tudex Patch Builder Utility (Differential Updater)
=====================================================

Usage:
  npm run build-patch -- [options]

Options:
  --game <name>             Name of the game (e.g. juego1, mygame). Default: juego1
  --new <path>              Path to directory with new game version (REQUIRED)
  --old <path>              Path to directory with previous game version (OPTIONAL)
  --version <num>           Target version number. Default: 1
  --from-version <num>      Previous version number
  --base-url <url>          Base URL of static web server. Default: http://localhost:8081
  --out <path>              Output directory. Default: ./public_html
  --volume-size <size>      Volume chunk size (e.g. 50m, 100m, 250m, none). Default: 50m

Examples:
  # Build full client v1 with 50MB volume chunks:
  npm run build-patch -- --game juego1 --version 1 --new C:/Games/Juego_V1 --volume-size 50m

  # Build differential patch from v1 to v2:
  npm run build-patch -- --game juego1 --version 2 --old C:/Games/Juego_V1 --new C:/Games/Juego_V2 --volume-size 50m
`);
}

/**
 * Calculate SHA-256 hash of a file supporting files > 2GB
 */
function getFileHash(filePath) {
    const hashSum = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const bufferSize = 64 * 1024 * 1024; // 64MB chunk buffer
    const buffer = Buffer.alloc(bufferSize);
    let bytesRead = 0;

    try {
        while ((bytesRead = fs.readSync(fd, buffer, 0, bufferSize, null)) > 0) {
            hashSum.update(buffer.subarray(0, bytesRead));
        }
    } finally {
        try { fs.closeSync(fd); } catch (e) {}
    }

    return hashSum.digest('hex');
}

/**
 * Recursively list all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, baseDir);
        } else {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            arrayOfFiles.push({
                fullPath,
                relativePath,
                size: fs.statSync(fullPath).size
            });
        }
    });

    return arrayOfFiles;
}

/**
 * Compress staging directory using 7-Zip with direct CLI volume splitting (-v50m)
 */
function compress7z(sourceDir, archivePath, volumeSize = '50m') {
    return new Promise((resolve, reject) => {
        const baseName = path.basename(archivePath);
        const parentDir = path.dirname(archivePath);

        // Remove any existing archives/chunks matching baseName
        if (fs.existsSync(parentDir)) {
            fs.readdirSync(parentDir).forEach(f => {
                if (f === baseName || f.startsWith(baseName + '.')) {
                    try { fs.unlinkSync(path.join(parentDir, f)); } catch (e) {}
                }
            });
        }

        const args = ['a', archivePath, `${sourceDir}/*`, '-mx=5', '-bsp1'];

        if (volumeSize && volumeSize.toLowerCase() !== 'none' && volumeSize !== '0') {
            args.push(`-v${volumeSize}`);
        }

        const child = execFile(path7za, args, { cwd: parentDir });

        child.stdout.on('data', (data) => {
            const str = data.toString();
            const match = str.match(/(\d+)%/);
            if (match) {
                process.stdout.write(`\rCompressing 7z patch: ${match[1]}%`);
            }
        });

        child.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('\nCompression completed successfully.');
                resolve();
            } else {
                reject(new Error(`7zip process exited with code ${code}`));
            }
        });
    });
}

async function main() {
    const options = parseArgs();

    if (options.help || !options.newDir) {
        showHelp();
        if (!options.newDir && !options.help) {
            console.error('\nERROR: --new <path> is required.');
        }
        process.exit(options.help ? 0 : 1);
    }

    if (!fs.existsSync(options.newDir)) {
        console.error(`ERROR: Directory specified in --new does not exist: ${options.newDir}`);
        process.exit(1);
    }

    const gameName = options.game;
    const isDifferential = !!options.oldDir;
    const targetGameOutDir = path.join(options.outDir, 'games', gameName);
    const stagingDir = path.join(options.outDir, 'temp_staging', gameName);

    console.log(`\n=== Tudex Patch Builder ===`);
    console.log(`Game: ${gameName}`);
    console.log(`Target Version: ${options.version}`);
    console.log(`Mode: ${isDifferential ? 'Differential Patch' : 'Full Client'}`);
    console.log(`Volume Chunk Size: ${options.volumeSize}`);
    console.log(`New directory: ${options.newDir}`);
    if (isDifferential) {
        console.log(`Old directory: ${options.oldDir}`);
    }

    // Clean & create staging directory
    if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(targetGameOutDir, { recursive: true });

    const newFiles = getAllFiles(options.newDir);
    let filesToPack = [];

    if (isDifferential) {
        if (!fs.existsSync(options.oldDir)) {
            console.error(`ERROR: Directory specified in --old does not exist: ${options.oldDir}`);
            process.exit(1);
        }

        console.log('\nAnalyzing files for differential update...');
        const oldFiles = getAllFiles(options.oldDir);
        const oldFilesMap = new Map();
        oldFiles.forEach(f => {
            oldFilesMap.set(f.relativePath, f);
        });

        newFiles.forEach(file => {
            const oldFile = oldFilesMap.get(file.relativePath);
            if (!oldFile) {
                filesToPack.push({ ...file, status: 'ADDED' });
            } else if (file.size !== oldFile.size || getFileHash(file.fullPath) !== getFileHash(oldFile.fullPath)) {
                filesToPack.push({ ...file, status: 'MODIFIED' });
            }
        });

        console.log(`Differential Analysis Results:`);
        console.log(`- Total new version files: ${newFiles.length}`);
        console.log(`- Total old version files: ${oldFiles.length}`);
        console.log(`- Files to include in patch: ${filesToPack.length}`);
    } else {
        filesToPack = newFiles.map(f => ({ ...f, status: 'FULL' }));
        console.log(`Full client packaging: ${filesToPack.length} files total.`);
    }

    if (filesToPack.length === 0) {
        console.log('\nNo changes detected between old and new directory. Nothing to pack!');
        process.exit(0);
    }

    // Copy files to staging folder preserving directory hierarchy
    console.log('\nStaging files for compression...');
    filesToPack.forEach(f => {
        const destPath = path.join(stagingDir, f.relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(f.fullPath, destPath);
    });

    // Base archive name
    let archiveName;
    if (isDifferential) {
        archiveName = `patch_v${options.fromVersion}_to_v${options.version}.7z`;
    } else {
        archiveName = `client_v${options.version}.7z`;
    }

    const archiveOutputPath = path.join(targetGameOutDir, archiveName);
    console.log(`\nCompressing files into 7z archive volumes (${options.volumeSize}): ${archiveName}`);
    await compress7z(stagingDir, archiveOutputPath, options.volumeSize);

    // Clean staging folder
    fs.rmSync(stagingDir, { recursive: true, force: true });

    // Detect generated volume files (.7z, .7z.001, .7z.002...)
    const outFiles = fs.readdirSync(targetGameOutDir);
    const generatedChunks = outFiles.filter(f => f === archiveName || f.startsWith(archiveName + '.'));
    generatedChunks.sort();

    console.log(`\nGenerated ${generatedChunks.length} volume chunk file(s):`);
    generatedChunks.forEach(c => console.log(`  - ${c}`));

    // Update config.json in output-web/
    const configPath = path.join(options.outDir, 'config.json');
    let webConfig = {
        updaterUrl: `${options.baseUrl}/config.json`,
        launcherVer: 1,
        selectedGame: gameName,
        selectedLanguage: 'EN',
        games: []
    };

    if (fs.existsSync(configPath)) {
        try {
            webConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.warn('Existing config.json invalid, creating new one.');
        }
    }

    let gameConfig = webConfig.games.find(g => g.name === gameName);
    if (!gameConfig) {
        gameConfig = {
            name: gameName,
            clientVer: isDifferential ? 1 : options.version,
            patchVer: 0,
            clientUrl: '',
            patchUrls: []
        };
        webConfig.games.push(gameConfig);
    }

    const chunkUrls = generatedChunks.map(c => `${options.baseUrl}/games/${gameName}/${c}`);

    // Generate manifest checksums for integrity verification across all files
    console.log('\nGenerating SHA-256 file integrity manifest for target build...');
    const manifest = {};
    newFiles.forEach(f => {
        manifest[f.relativePath] = {
            size: f.size,
            hash: getFileHash(f.fullPath)
        };
    });
    gameConfig.manifest = manifest;

    if (isDifferential) {
        gameConfig.patchUrls = chunkUrls;
        gameConfig.patchVer = options.version;
    } else {
        gameConfig.clientVer = options.version;
        gameConfig.patchVer = 0;
        gameConfig.patchUrls = [];
        if (chunkUrls.length > 0) {
            gameConfig.clientUrl = chunkUrls[0];
            gameConfig.clientChunks = chunkUrls;
        }
    }

    // Ensure full base client (client_v1.7z) exists for new players
    const existingClientFiles = fs.readdirSync(targetGameOutDir).filter(f => f.startsWith('client_v'));
    if (options.fullClient || existingClientFiles.length === 0) {
        console.log(`\n📦 Building Base Full Client Archive (client_v1.7z) for new player installations...`);
        const clientStaging = path.join(options.outDir, `.staging_client_${Date.now()}`);
        fs.mkdirSync(clientStaging, { recursive: true });
        newFiles.forEach(f => {
            const destPath = path.join(clientStaging, f.relativePath);
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(f.fullPath, destPath);
        });

        const clientArchiveName = `client_v1.7z`;
        const clientOutputPath = path.join(targetGameOutDir, clientArchiveName);
        await compress7z(clientStaging, clientOutputPath, options.volumeSize);
        fs.rmSync(clientStaging, { recursive: true, force: true });

        const clientOutFiles = fs.readdirSync(targetGameOutDir);
        const clientChunks = clientOutFiles
            .filter(f => f === clientArchiveName || f.startsWith(clientArchiveName + '.'))
            .sort();

        if (clientChunks.length > 0) {
            gameConfig.clientUrl = `${options.baseUrl}/games/${gameName}/${clientChunks[0]}`;
            gameConfig.clientChunks = clientChunks.map(c => `${options.baseUrl}/games/${gameName}/${c}`);
            gameConfig.clientVer = 1;
        }
    }

    fs.writeFileSync(configPath, JSON.stringify(webConfig, null, 4), 'utf8');

    // Promotion logic: copy next to current if requested or running workspace convention
    if (options.promote && options.newDir) {
        const workspaceGameDir = path.resolve(process.cwd(), 'workspace', gameName);
        const targetCurrent = path.join(workspaceGameDir, 'current');
        if (options.newDir !== targetCurrent) {
            console.log(`\nPromoting build from ${options.newDir} -> ${targetCurrent}...`);
            if (fs.existsSync(targetCurrent)) {
                fs.rmSync(targetCurrent, { recursive: true, force: true });
            }
            fs.mkdirSync(targetCurrent, { recursive: true });
            fs.cpSync(options.newDir, targetCurrent, { recursive: true });
            console.log(`✅ Promoted successfully to workspace/${gameName}/current`);
        }
    }

    console.log(`
=====================================================
 SUCCESS! ${isDifferential ? 'Differential Patch' : 'Full Client'} Package Created
=====================================================
 Volume Chunks: ${generatedChunks.length} file(s)
 Output Folder: ${targetGameOutDir}
 Updated Web Config: ${configPath}

 Upload the contents of "${options.outDir}" to your static web server.
=====================================================
`);
}

main().catch(err => {
    console.error('Build patch failed with error:', err);
    process.exit(1);
});
