// ============================================================
// Antigravity Model — Database Migration Runner
// Run: npm run migrate
// ============================================================
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', '..', '..', 'database', 'migrations');
  
  try {
    // Get all SQL files sorted
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n🚀 Running ${files.length} migration(s)...\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`  📄 Executing: ${file}`);
      await pool.query(sql);
      console.log(`  ✅ Completed: ${file}\n`);
    }

    console.log('🎉 All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
