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
import accountProgressRouter from './routes/accountProgress.js';
import sessionsStatsRouter from './routes/sessionsStats.js';
import tradersRouter from './routes/traders.js';
import { requireAuth, isAuthConfigured } from './services/auth.js';
import { scheduleRulesRefresh } from './services/rulesRefresh.js';

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
app.use('/api/account-progress', accountProgressRouter);
app.use('/api/sessions-stats', sessionsStatsRouter);
app.use('/api/traders', tradersRouter);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('TTT Futures Lab running on port ' + PORT);
  console.log(isAuthConfigured() ? 'Auth activada' : 'WARN: APP_PASSWORD no configurada');
  if (process.env.ANTHROPIC_API_KEY) scheduleRulesRefresh();
});
