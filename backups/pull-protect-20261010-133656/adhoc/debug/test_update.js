import { query } from '../../../src/lib/db.js';

async function check() {
  try {
    const res = await query(`
      UPDATE program_applications 
      SET status = 'withdrawn', notes = CONCAT(notes, '\\nWithdrawal Reason: ', $1::text), updated_at = NOW()
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `, ['Student cancelled']);
    console.log("Update success", res.rowCount);
  } catch(e) {
    console.error("Update failed", e.message);
  }
}
check();
