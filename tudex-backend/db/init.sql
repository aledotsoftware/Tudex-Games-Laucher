-- =====================================================
-- Tudex Games Launcher - Database Schema
-- =====================================================

-- Developers table (users who manage games)
CREATE TABLE IF NOT EXISTS developers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developers(id) ON DELETE CASCADE,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    start_cmd VARCHAR(500) NOT NULL DEFAULT 'start game.exe',
    client_ver INTEGER DEFAULT 0,
    client_url VARCHAR(500),
    client_filename VARCHAR(255),
    maintenance BOOLEAN DEFAULT false,
    icon_url VARCHAR(500),
    background_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patches table (ordered patches for each game)
CREATE TABLE IF NOT EXISTS patches (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    patch_url VARCHAR(500) NOT NULL,
    patch_filename VARCHAR(255) NOT NULL,
    patch_order INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, patch_order)
);

-- Voice packs for each game
CREATE TABLE IF NOT EXISTS voice_packs (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    value VARCHAR(10) NOT NULL,
    label VARCHAR(100) NOT NULL,
    UNIQUE(game_id, value)
);

-- Launcher versions tracking
CREATE TABLE IF NOT EXISTS launcher_versions (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    download_url VARCHAR(500) NOT NULL,
    is_current BOOLEAN DEFAULT false,
    changelog TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_developer ON games(developer_id);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_patches_game ON patches(game_id);
CREATE INDEX IF NOT EXISTS idx_patches_order ON patches(game_id, patch_order);
CREATE INDEX IF NOT EXISTS idx_voice_packs_game ON voice_packs(game_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_dev ON activity_log(developer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_game ON activity_log(game_id);

-- Insert initial launcher version
INSERT INTO launcher_versions (version, download_url, is_current)
VALUES (1, 'https://launcher.tudexgames.com/uploads/launcher/TudexGamesLauncher.exe', true)
ON CONFLICT DO NOTHING;
