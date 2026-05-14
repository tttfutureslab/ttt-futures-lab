import crypto from 'crypto';

const COOKIE_NAME = 'ttt_auth';
const SECRET = process.env.AUTH_SECRET || 'change-me-in-production';
const APP_PASSWORD = process.env.APP_PASSWORD;
// Sesión persistente: 1 año
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Firma un valor con HMAC-SHA256 usando el secret.
 */
function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

/**
 * Crea un token firmado con fecha de expiración.
 */
export function createAuthToken() {
  const expiresAt = Date.now() + MAX_AGE_MS;
  const payload = `auth.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

/**
 * Verifica si un token es válido y no ha expirado.
 */
export function verifyAuthToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [prefix, expiresAtStr, signature] = parts;
  if (prefix !== 'auth') return false;

  const payload = `${prefix}.${expiresAtStr}`;
  const expected = sign(payload);
  // Comparación constant-time para prevenir timing attacks
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

/**
 * Parsea cookies del header Cookie.
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

/**
 * Lee la cookie de auth de la request.
 */
export function getAuthCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || null;
}

/**
 * Construye el header Set-Cookie para login.
 */
export function buildAuthCookieHeader(token) {
  const maxAge = Math.floor(MAX_AGE_MS / 1000);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
}

/**
 * Cookie de logout (vacía y expirada).
 */
export function buildLogoutCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}

/**
 * Middleware que protege las rutas /api/* (excepto auth y health).
 */
export function requireAuth(req, res, next) {
  // Rutas públicas
  if (
    req.path === '/api/health' ||
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/status' ||
    req.path === '/api/auth/logout'
  ) {
    return next();
  }

  // Si no hay APP_PASSWORD configurada, no exigir auth (modo desarrollo)
  if (!APP_PASSWORD) {
    console.warn('⚠️  APP_PASSWORD no configurada — autenticación desactivada');
    return next();
  }

  // Solo proteger rutas /api/
  if (!req.path.startsWith('/api/')) return next();

  const token = getAuthCookie(req);
  if (!verifyAuthToken(token)) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

/**
 * Verifica una contraseña (comparación constant-time).
 */
export function checkPassword(provided) {
  if (!APP_PASSWORD) return false;
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(APP_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isAuthConfigured() {
  return !!APP_PASSWORD;
}
