import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import accountsRouter from './routes/accounts.js';
import visionRouter from './routes/vision.js';
import rulesRouter from './routes/rules.js';
import chatRouter from './routes/chat.js';
import snapshotsRouter from './routes/snapshots.js';
import { scheduleRulesRefresh } from './services/rulesRefresh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'TTT Futures Lab' }));

app.use('/api/accounts', accountsRouter);
app.use('/api/vision', visionRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/snapshots', snapshotsRouter);

// Servir frontend buildeado (cuando Railway haga el build)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔬 TTT Futures Lab running on port ${PORT}`);
  if (process.env.ANTHROPIC_API_KEY) {
    scheduleRulesRefresh();
  } else {
    console.warn('⚠️  ANTHROPIC_API_KEY no configurada. Cron de normas desactivado.');
  }
});
