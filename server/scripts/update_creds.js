const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const mdHash = await bcrypt.hash('Prabhu@Aharada', 10);
  const hodHash = await bcrypt.hash('HOD@Aharadaedu', 10);

  // Update MD (Dean)
  await pool.query("UPDATE users SET email = $1, password = $2, name = $3 WHERE role = 'Dean'", ['md@aharadaedu.in', mdHash, 'Capt. Deepak Dhalla']);
  
  // Update HOD (assuming Dr. Priya Sharma is the HOD)
  await pool.query("UPDATE users SET email = $1, password = $2 WHERE role = 'HOD'", ['hod@aharadaedu.in', hodHash]);

  console.log('Credentials updated!');
  process.exit(0);
}

run();
