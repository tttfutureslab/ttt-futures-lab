import { Router } from 'express';
import multer from 'multer';
import { extractAccountData } from '../services/visionService.js';
import { query } from '../db/pool.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/vision/analyze
 * Body: multipart/form-data con `screenshot` (image) + `account_id` (opcional)
 * Si se pasa account_id, guarda directamente como snapshot.
 * Si no, solo devuelve los datos extraídos para que el usuario revise antes.
 */
router.post('/analyze', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha subido ninguna imagen' });

    const imageBase64 = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype || 'image/png';

    const extracted = await extractAccountData(imageBase64, mediaType);

    // Si viene account_id, lo guardamos directamente
    if (req.body.account_id) {
      const snap = await query(
        `INSERT INTO snapshots
          (account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, raw_vision_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          req.body.account_id,
          extracted.balance,
          extracted.equity,
          extracted.pnl_today,
          extracted.pnl_total,
          extracted.trailing_dd_now,
          extracted.best_day_pnl,
          extracted.trading_days,
          extracted
        ]
      );
      return res.json({ extracted, snapshot: snap.rows[0], saved: true });
    }

    res.json({ extracted, saved: false });
  } catch (err) {
    console.error('Vision analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/vision/save-snapshot
 * Guarda un snapshot tras revisión del usuario (cuando ha confirmado los datos).
 */
router.post('/save-snapshot', async (req, res) => {
  try {
    const { account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, raw_vision_data, notes } = req.body;
    const result = await query(
      `INSERT INTO snapshots
        (account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, raw_vision_data, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [account_id, balance, equity, pnl_today, pnl_total, trailing_dd_now, best_day_pnl, trading_days, raw_vision_data, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
