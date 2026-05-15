const API = '/api';

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'include', // ⬅️ Envía la cookie de sesión
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (res.status === 401) {
    // Sesión expirada o no autenticado → redirige al login
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('No autenticado');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const getAuthStatus = () => jsonFetch(`${API}/auth/status`);
export const login = (password) => jsonFetch(`${API}/auth/login`, { method: 'POST', body: JSON.stringify({ password }) });
export const logout = () => jsonFetch(`${API}/auth/logout`, { method: 'POST' });

// Accounts
export const getAccounts = () => jsonFetch(`${API}/accounts`);
export const createAccount = (data) => jsonFetch(`${API}/accounts`, { method: 'POST', body: JSON.stringify(data) });
export const updateAccount = (id, data) => jsonFetch(`${API}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAccount = (id) => jsonFetch(`${API}/accounts/${id}`, { method: 'DELETE' });
export const getFirms = () => jsonFetch(`${API}/accounts/firms/list`);

// Vision
export async function analyzeScreenshot(file, accountId) {
  const fd = new FormData();
  fd.append('screenshot', file);
  if (accountId) fd.append('account_id', accountId);
  const res = await fetch(`${API}/vision/analyze`, { method: 'POST', body: fd, credentials: 'include' });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('No autenticado');
  }
  if (!res.ok) throw new Error('Vision error');
  return res.json();
}
export const saveSnapshot = (data) => jsonFetch(`${API}/vision/save-snapshot`, { method: 'POST', body: JSON.stringify(data) });

// Rules
export const getRules = () => jsonFetch(`${API}/rules`);
export const getRuleChanges = () => jsonFetch(`${API}/rules/changes`);
export const refreshRules = () => jsonFetch(`${API}/rules/refresh`, { method: 'POST' });

// Chat
export const sendChat = (session_id, message) => jsonFetch(`${API}/chat/message`, { method: 'POST', body: JSON.stringify({ session_id, message }) });
export const getSession = (sid) => jsonFetch(`${API}/chat/session/${sid}`);
export const getSessions = () => jsonFetch(`${API}/chat/sessions`);

// Snapshots
export const getAccountHistory = (id) => jsonFetch(`${API}/snapshots/account/${id}`);
export const getLatestSnapshots = () => jsonFetch(`${API}/snapshots/latest`);

export const getTraders = () => jsonFetch('${API}/traders');
