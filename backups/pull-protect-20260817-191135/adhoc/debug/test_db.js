import { query } from '../../../src/lib/db.js';

async function check() {
  try {
    const apps = await query(`SELECT * FROM program_applications LIMIT 5`);
    console.log("Program Apps:", apps.rows);
    
    const dApps = await query(`SELECT * FROM applications LIMIT 5`);
    console.log("Drive Apps:", dApps.rows);
  } catch(e) {
    console.error(e);
  }
}
check();
