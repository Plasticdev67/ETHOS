import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const TARGET_URL = process.argv[2];
if (!TARGET_URL) {
  console.error('Usage: node scripts/restore-db.mjs <target-connection-string>');
  process.exit(1);
}

const pool = new Pool({ connectionString: TARGET_URL });

async function restore() {
  const sql = fs.readFileSync('neon-dump.sql', 'utf-8');
  const client = await pool.connect();

  try {
    // Split into individual statements
    const statements = sql.split('\n').filter(line =>
      line.trim() && !line.startsWith('--')
    );

    console.log(`Processing ${statements.length} SQL statements...\n`);

    // Disable foreign key checks during import
    await client.query('SET session_replication_role = replica;');

    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        success++;
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
          skipped++;
        } else {
          errors++;
          if (errors <= 10) {
            console.error(`Error: ${err.message}`);
            console.error(`  Statement: ${stmt.substring(0, 100)}...`);
          }
        }
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');

    console.log(`\nDone!`);
    console.log(`  Successful: ${success}`);
    console.log(`  Skipped (duplicates): ${skipped}`);
    console.log(`  Errors: ${errors}`);

  } finally {
    client.release();
    await pool.end();
  }
}

restore().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
