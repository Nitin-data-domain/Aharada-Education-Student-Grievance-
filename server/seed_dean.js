require('dotenv').config();
const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
    ['Dr. Dean', 'dean@university.edu', hash, 'Dean']
  );
  console.log('Dean added');
  process.exit(0);
}

run().catch(console.error);
