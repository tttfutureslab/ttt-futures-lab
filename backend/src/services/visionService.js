import { claude, CLAUDE_MODEL } from './claude.js';

const VISION_SYSTEM_PROMPT = `Eres un experto leyendo dashboards de prop firms de futuros (TopOne Futures, Tradeify, MyFundedFutures).

Tu tarea es extraer datos numéricos de la captura del dashboard que el usuario te muestre.

Devuelve SIEMPRE un JSON válido con esta estructura exacta (sin markdown, sin explicaciones, solo el JSON):

{
  "prop_firm": "topone" | "tradeify" | "mffu" | "unknown",
  "account_label": "string o null si no se ve",
  "account_size": número o null,
  "balance": número o null,
  "equity": número o null,
  "pnl_today": número o null,
  "pnl_total": número o null,
  "trailing_dd_now": número o null,
  "best_day_pnl": número o null,
  "trading_days": número o null,
  "profit_target": número o null,
  "status": "active" | "passed" | "blown" | "paused" | "unknown",
  "confidence": "high" | "medium" | "low",
  "raw_observations": "texto libre con lo que ves en la captura"
}

Reglas:
- Si un campo no se ve claramente, ponlo a null. Nunca inventes números.
- Los valores monetarios siempre como números (sin $ ni comas). Ej: 50000.00, -1250.50
- Los P&L negativos con signo menos.
- "best_day_pnl" es el mejor día de profit (para regla de consistencia).
- Si no estás seguro de la prop firm, pon "unknown" y describe lo que ves en raw_observations.`;

/**
 * Lee una imagen (base64) y devuelve los datos extraídos.
 */
export async function extractAccountData(imageBase64, mediaType = 'image/png') {
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: 'Extrae los datos de esta captura del dashboard. Devuelve solo el JSON.'
          }
        ]
      }
    ]
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');

  // Limpia posibles ```json ... ``` por si acaso
  const clean = text.replace(/```json\s*|\s*```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('JSON parse error from Claude vision:', text);
    throw new Error('Claude no devolvió JSON válido. Raw: ' + text.slice(0, 300));
  }
}
