// Gestor del trader actual en el frontend
// Persistido en localStorage tras eleccion en TraderPicker

const STORAGE_KEY = 'ttt_current_trader';

export function getCurrentTrader() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function setCurrentTrader(slug) {
  if (slug) localStorage.setItem(STORAGE_KEY, slug);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('trader:changed', { detail: { slug } }));
}

export function clearCurrentTrader() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('trader:changed', { detail: { slug: null } }));
}
