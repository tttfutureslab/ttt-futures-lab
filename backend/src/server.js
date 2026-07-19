import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import accountsRouter from './routes/accounts.js';
import accountDetailRouter from './routes/accountDetail.js';
import rulesRouter from './routes/rules.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import dashboardStatsRouter from './routes/dashboardStats.js';
import adminCrudRouter from './routes/adminCrud.js';
import accountProgressRouter from './routes/accountProgress.js';
import sessionsStatsRouter from './routes/sessionsStats.js';
import tradersRouter from './routes/traders.js';
import economicCalendarRouter from './routes/economicCalendar.js';
import debugStateRouter from './routes/debugState.js';
import accountRulesRouter from './routes/accountRules.js';
import { fetchAndCacheEvents } from './services/economicCalendar.js';
import cron from 'node-cron';
import { requireAuth, isAuthConfigured } from './services/auth.js';
// DISABLED: rulesRefresh usa web_search diario y es caro. Reglas ya en account_type_rules.
// import { scheduleRulesRefresh } from './services/rulesRefresh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'TTT Futures Lab' }));
app.use('/api/auth', authRouter);
app.use(requireAuth);

app.use('/api/accounts', accountsRouter);
app.use('/api/account-detail', accountDetailRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/dashboard-stats', dashboardStatsRouter);
app.use('/api/admin', adminCrudRouter);
app.use('/api/account-progress', accountProgressRouter);
app.use('/api/sessions-stats', sessionsStatsRouter);
app.use('/api/traders', tradersRouter);
app.use('/api/economic-calendar', economicCalendarRouter);
app.use('/api/debug-state', debugStateRouter);
app.use('/api/account-rules', accountRulesRouter);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Cron: descarga eventos económicos de Forex Factory una vez al día (5:00 UTC = 7:00 Madrid)
cron.schedule('0 5 * * *', async () => {
  console.log('[cron] Iniciando descarga diaria de Forex Factory...');
  try {
    const result = await fetchAndCacheEvents();
    console.log('[cron] Descarga completa:', result);
  } catch (err) {
    console.error('[cron] Error:', err.message);
  }
}, { timezone: 'UTC' });

// Al arrancar el servidor, descarga inicial si no hay eventos cacheados
import { query as dbQuery } from './db/pool.js';
setTimeout(async () => {
  try {
    const r = await dbQuery('SELECT COUNT(*) AS c FROM economic_events WHERE event_at >= NOW()');
    if (Number(r.rows[0].c) === 0) {
      console.log('[startup] Sin eventos económicos cacheados, descargando...');
      await fetchAndCacheEvents();
    }
  } catch (err) {
    console.error('[startup] Error en descarga inicial:', err.message);
  }
}, 5000);

app.listen(PORT, () => {
  console.log('TTT Futures Lab running on port ' + PORT);
  console.log(isAuthConfigured() ? 'Auth activada' : 'WARN: APP_PASSWORD no configurada');
  // if (process.env.ANTHROPIC_API_KEY) scheduleRulesRefresh(); // DISABLED
});
