import pg from 'pg';
const { Pool } = pg;

const SOURCE_URL = process.argv[2];
if (!SOURCE_URL) {
  console.error('Usage: node scripts/dump-db.mjs <source-connection-string>');
  process.exit(1);
}

const pool = new Pool({ connectionString: SOURCE_URL });

async function dump() {
  const client = await pool.connect();
  try {
    // Get all tables in public schema
    const tablesRes = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = tablesRes.rows.map(r => r.tablename);
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}\n`);

    // Get enum types
    const enumsRes = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);

    const enums = {};
    for (const row of enumsRes.rows) {
      if (!enums[row.typname]) enums[row.typname] = [];
      enums[row.typname].push(row.enumlabel);
    }
    console.log(`Found ${Object.keys(enums).length} enum types\n`);

    // Get full DDL - columns, constraints, indexes
    const ddlRes = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable,
        character_maximum_length,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // Output SQL
    let sql = '-- Database dump from Neon\n';
    sql += '-- Generated: ' + new Date().toISOString() + '\n\n';

    // Create enums
    for (const [name, values] of Object.entries(enums)) {
      sql += `-- Enum: ${name}\n`;
      sql += `DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${values.map(v => `'${v}'`).join(', ')}); EXCEPTION WHEN duplicate_object THEN null; END $$;\n\n`;
    }

    // Dump data for each table
    for (const table of tables) {
      if (table === '_prisma_migrations') continue;

      const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const count = parseInt(countRes.rows[0].cnt);
      console.log(`Table "${table}": ${count} rows`);

      if (count === 0) continue;

      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      const columns = dataRes.fields.map(f => `"${f.name}"`).join(', ');

      sql += `-- Table: ${table} (${count} rows)\n`;
      sql += `DELETE FROM "${table}" CASCADE;\n`;

      for (const row of dataRes.rows) {
        const values = dataRes.fields.map(f => {
          const val = row[f.name];
          if (val === null) return 'NULL';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');
        sql += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
      }
      sql += '\n';
    }

    // Write to file
    const fs = await import('fs');
    const outPath = 'neon-dump.sql';
    fs.writeFileSync(outPath, sql);
    console.log(`\nDump written to ${outPath} (${(sql.length / 1024).toFixed(1)} KB)`);

  } finally {
    client.release();
    await pool.end();
  }
}

dump().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
