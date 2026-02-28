import pg from 'pg';
const { Pool } = pg;

const SOURCE_URL = process.argv[2];
const TARGET_URL = process.argv[3];

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Usage: node scripts/fix-failed-rows.mjs <source-url> <target-url>');
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: SOURCE_URL });
const targetPool = new Pool({ connectionString: TARGET_URL });

async function fixRows() {
  const source = await sourcePool.connect();
  const target = await targetPool.connect();

  try {
    // Fix opportunities - get all from source, upsert into target
    const tables = ['opportunities', 'prospects'];

    for (const table of tables) {
      const sourceRows = await source.query(`SELECT * FROM "${table}"`);
      console.log(`${table}: ${sourceRows.rows.length} rows from source`);

      for (const row of sourceRows.rows) {
        // Check if row exists in target
        const exists = await target.query(`SELECT id FROM "${table}" WHERE id = $1`, [row.id]);
        if (exists.rows.length > 0) continue;

        // Build parameterized insert
        const cols = Object.keys(row);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const values = cols.map(c => row[c]);

        try {
          await target.query(
            `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`,
            values
          );
          console.log(`  Inserted missing row ${row.id} into ${table}`);
        } catch (err) {
          console.error(`  Error inserting ${row.id}: ${err.message}`);
        }
      }
    }

    console.log('\nDone fixing failed rows!');
  } finally {
    source.release();
    target.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

fixRows().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
