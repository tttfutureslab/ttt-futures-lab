import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration ${file}...`);
    try {
      await pool.query(sql);
      console.log(`OK ${file}`);
    } catch (err) {
      console.error(`FAIL ${file}:`, err.message);
    }
  }
  await pool.end();
}
migrate().catch((err) => { console.error(err); process.exit(1); });
