const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('tudex_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('tudex_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async setup(email, password, name) {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  // Games
  async getGames() {
    const res = await fetch(`${API_BASE}/games`, { headers: getHeaders() });
    return res.json();
  },

  async getGame(name) {
    const res = await fetch(`${API_BASE}/games/${name}`, { headers: getHeaders() });
    return res.json();
  },

  async createGame(data) {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateGame(name, data) {
    const res = await fetch(`${API_BASE}/games/${name}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async toggleMaintenance(name, maintenance) {
    const res = await fetch(`${API_BASE}/games/${name}/maintenance`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ maintenance }),
    });
    return res.json();
  },

  async deleteGame(name) {
    const res = await fetch(`${API_BASE}/games/${name}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // File uploads
  async uploadClient(gameName, file) {
    const formData = new FormData();
    formData.append('client', file);
    const res = await fetch(`${API_BASE}/games/${gameName}/client`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return res.json();
  },

  async uploadPatch(gameName, file, description) {
    const formData = new FormData();
    formData.append('patch', file);
    if (description) formData.append('description', description);
    const res = await fetch(`${API_BASE}/games/${gameName}/patch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return res.json();
  },

  async uploadIcon(gameName, file) {
    const formData = new FormData();
    formData.append('icon', file);
    const res = await fetch(`${API_BASE}/games/${gameName}/icon`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return res.json();
  },

  async uploadBackground(gameName, file) {
    const formData = new FormData();
    formData.append('background', file);
    const res = await fetch(`${API_BASE}/games/${gameName}/background`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return res.json();
  },

  async setVoicePacks(gameName, voicePacks) {
    const res = await fetch(`${API_BASE}/games/${gameName}/voicepacks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ voicePacks }),
    });
    return res.json();
  },

  async getActivity(gameName) {
    const res = await fetch(`${API_BASE}/games/${gameName}/activity`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Launcher
  async getLauncherVersion() {
    const res = await fetch(`${API_BASE}/launcher/version`);
    return res.json();
  },

  async getLauncherVersions() {
    const res = await fetch(`${API_BASE}/launcher/versions`, { headers: getHeaders() });
    return res.json();
  },

  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
