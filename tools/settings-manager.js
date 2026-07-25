const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.resolve(process.cwd(), 'patch-studio-settings.json');

function loadSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return {
            ftp: {
                enabled: false,
                host: '',
                port: '21',
                user: '',
                password: '',
                remoteDir: '/public_html'
            },
            games: {}
        };
    }

    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return {
            ftp: { enabled: false, host: '', port: '21', user: '', password: '', remoteDir: '/public_html' },
            games: {}
        };
    }
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4), 'utf8');
}

function getGameHistory(gameName) {
    const settings = loadSettings();
    return settings.games[gameName] || null;
}

function updateGameHistory(gameName, version, buildPath) {
    const settings = loadSettings();
    if (!settings.games[gameName]) {
        settings.games[gameName] = {};
    }
    const prevHistory = settings.games[gameName];
    settings.games[gameName] = {
        lastVersion: version,
        lastBuildPath: buildPath,
        history: [
            ...(prevHistory.history || []),
            { version, path: buildPath, date: new Date().toISOString() }
        ]
    };
    saveSettings(settings);
}

module.exports = {
    loadSettings,
    saveSettings,
    getGameHistory,
    updateGameHistory
};
