import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local or .env
const envPath = fs.existsSync(path.join(process.cwd(), '.env.local'))
  ? path.join(process.cwd(), '.env.local')
  : path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[ERREUR] Aucune DATABASE_URL trouvee dans .env.local. Veuillez coller votre lien Neon PostgreSQL dans .env.local.');
    process.exit(1);
  }

  console.log('[INFO] Connexion a Neon PostgreSQL et initialisation des tables...');
  const sql = neon(dbUrl);
  const schemaPath = path.join(process.cwd(), 'neon_schema.sql');
  const rawSql = fs.readFileSync(schemaPath, 'utf8');

  // Split statements by semicolon at end of line
  const statements = rawSql
    .split(/;\s*\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    await sql(stmt);
  }

  console.log('[OK] Base de donnees Neon initialisee avec succes avec les 38 plats et boissons de La Gratitude.');
}

main().catch(err => {
  console.error('[ERREUR] Erreur lors de l initialisation Neon :', err);
  process.exit(1);
});
