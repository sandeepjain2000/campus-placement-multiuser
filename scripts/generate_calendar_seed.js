import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Ranchi', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Howrah', 'Gwalior', 'Jabalpur', 'Coimbatore', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad'];

const TECHCORP_ID = 'c1000000-0000-0000-0000-000000000001';
const ADMIN_ID = 'b1000000-0000-0000-0000-000000000002'; // some generic admin id for approvals

// Create 50 colleges
const colleges = [];
for (let i = 0; i < 50; i++) {
  const city = cities[i];
  colleges.push({
    id: `c011e9e0-0000-0000-0000-${String(i).padStart(12, '0')}`,
    name: `Institute of Technology, ${city}`,
    slug: `iot-${city.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    type: 'college',
    city: city,
    state: 'State',
    email: `placement@iot${city.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`
  });
}

// Generate SQL
let sql = `-- Auto-generated seed file for 50 colleges and 20 placement drives\n\n`;

sql += `-- 1. Insert 50 Colleges\n`;
for (const c of colleges) {
  sql += `INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, naac_grade, established_year, website, logo_url, phone, address, pincode, settings) VALUES 
  ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.slug}', '${c.type}', '${c.city}', '${c.state}', '${c.email}', 'AICTE', 'A', 2000, 'https://${c.slug}.edu', '/logos/default-college.svg', '+91-0000000000', 'Main Campus', '000000', '{}'::jsonb) ON CONFLICT (id) DO NOTHING;\n`;
}

sql += `\n-- 2. Insert Employer Approvals for TechCorp\n`;
for (const c of colleges) {
  sql += `INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at) VALUES 
  ('${c.id}', '${TECHCORP_ID}', 'approved', '${ADMIN_ID}', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days') ON CONFLICT DO NOTHING;\n`;
}

sql += `\n-- 3. Create a Job Posting for TechCorp to attach to drives\n`;
const jobId = uuidv4();
sql += `INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status) VALUES 
('${jobId}', '${TECHCORP_ID}', 'Software Engineer (Campus Hiring)', 'Campus hiring across various top institutions.', 'full_time', 'Engineering', ARRAY['Bangalore', 'Pune'], 1200000, 1600000, ARRAY['Computer Science & Engineering'], 7.0, 0, 2026, ARRAY['Java', 'Python'], 50, 'published') ON CONFLICT (id) DO NOTHING;\n`;

sql += `\n-- 4. Create Placement Drives in 20 Colleges\n`;
const drivesColleges = colleges.slice(0, 20); // Pick first 20 colleges
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth(); // 0-indexed

for (let i = 0; i < drivesColleges.length; i++) {
  const c = drivesColleges[i];
  
  // Random day in the current month or next month
  const targetMonth = Math.random() > 0.5 ? currentMonth : currentMonth + 1;
  const targetYear = targetMonth > 11 ? currentYear + 1 : currentYear;
  const actualMonth = targetMonth > 11 ? 0 : targetMonth;
  const targetDay = Math.floor(Math.random() * 28) + 1;
  
  const driveDate = `${targetYear}-${String(actualMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  
  const driveId = uuidv4();
  
  // Randomize type
  const type = Math.random() > 0.7 ? 'virtual' : 'on_campus';
  const status = Math.random() > 0.3 ? 'approved' : (Math.random() > 0.5 ? 'scheduled' : 'completed');
  
  sql += `INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES 
  ('${driveId}', '${c.id}', '${TECHCORP_ID}', '${jobId}', 'TechCorp Campus Drive at ${c.city}', 'Recruitment drive for SE role.', '${type}', '${driveDate}', '09:00', '17:00', 'Virtual/Campus', '${status}', 100, ${Math.floor(Math.random() * 50)}) ON CONFLICT (id) DO NOTHING;\n`;
}

const outputPath = path.join(process.cwd(), 'db', 'seeds', '50_colleges_events.sql');
fs.writeFileSync(outputPath, sql);
console.log('Seed SQL generated at:', outputPath);
