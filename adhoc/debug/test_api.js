import { POST } from '../../../src/app/api/student/program-applications/cancel/route.js';

async function run() {
  const req = {
    json: async () => ({ application_id: '12345678-1234-1234-1234-123456789012' })
  };
  
  // mock next-auth
  global.getServerSession = async () => ({ user: { id: '12345678-1234-1234-1234-123456789012', role: 'student' } });
  
  try {
    const res = await POST(req);
    console.log(await res.json());
  } catch(e) {
    console.error(e);
  }
}
// run();
