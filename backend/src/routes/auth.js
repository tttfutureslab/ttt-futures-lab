import { Router } from 'express';
import {
  checkPassword,
  createAuthToken,
  buildAuthCookieHeader,
  buildLogoutCookieHeader,
  getAuthCookie,
  verifyAuthToken,
  isAuthConfigured
} from '../services/auth.js';

const router = Router();

// Estado de la sesión (¿estoy autenticado?)
router.get('/status', (req, res) => {
  const configured = isAuthConfigured();
  if (!configured) return res.json({ authenticated: true, configured: false });
  const token = getAuthCookie(req);
  res.json({ authenticated: verifyAuthToken(token), configured: true });
});

// Login con contraseña
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!checkPassword(password)) {
    // Pequeño delay para mitigar fuerza bruta
    return setTimeout(() => res.status(401).json({ error: 'Contraseña incorrecta' }), 600);
  }
  const token = createAuthToken();
  res.setHeader('Set-Cookie', buildAuthCookieHeader(token));
  res.json({ ok: true });
});

// Logout
router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', buildLogoutCookieHeader());
  res.json({ ok: true });
});

export default router;
