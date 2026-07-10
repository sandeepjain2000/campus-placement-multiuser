const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('../lib/repo-root');

const ROUTES_SORTED = [
  '/dashboard',
  '/dashboard/admin',
  '/dashboard/admin/colleges',
  '/dashboard/admin/employers',
  '/dashboard/admin/pending-registrations',
  '/dashboard/admin/feedback',
  '/dashboard/admin/overview',
  '/dashboard/admin/settings',
  '/dashboard/admin/users',
  '/dashboard/alerts',
  '/dashboard/college',
  '/dashboard/college/applications',
  '/dashboard/college/calendar',
  '/dashboard/college/clarifications',
  '/dashboard/college/discussions',
  '/dashboard/college/drives',
  '/dashboard/college/enrollment-key',
  '/dashboard/college/guest-engagements',
  '/dashboard/college/employers',
  '/dashboard/college/employers/requests',
  '/dashboard/college/events',
  '/dashboard/college/hiring-assessment',
  '/dashboard/college/infrastructure',
  '/dashboard/college/interviews',
  '/dashboard/college/internship-results',
  '/dashboard/college/internships',
  '/dashboard/college/offers',
  '/dashboard/college/overview',
  '/dashboard/college/reports',
  '/dashboard/college/rules',
  '/dashboard/college/settings',
  '/dashboard/college/sponsorships',
  '/dashboard/college/students',
  '/dashboard/employer',
  '/dashboard/employer/applications',
  '/dashboard/employer/calendar',
  '/dashboard/employer/campus-guest-needs',
  '/dashboard/employer/discussions',
  '/dashboard/employer/drives',
  '/dashboard/employer/hiring-assessment',
  '/dashboard/employer/interviews',
  '/dashboard/employer/internships',
  '/dashboard/employer/jobs',
  '/dashboard/employer/offers',
  '/dashboard/employer/overview',
  '/dashboard/employer/profile',
  '/dashboard/employer/projects',
  '/dashboard/employer/select-campus',
  '/dashboard/employer/sponsorships',
  '/dashboard/feedback',
  '/dashboard/student',
  '/dashboard/student/applications',
  '/dashboard/student/calendar',
  '/dashboard/student/clarifications',
  '/dashboard/student/discussions',
  '/dashboard/student/documents',
  '/dashboard/student/drives',
  '/dashboard/student/internships',
  '/dashboard/student/projects',
  '/dashboard/student/interviews',
  '/dashboard/student/offers',
  '/dashboard/student/overview',
  '/dashboard/student/profile',
  '/dashboard/student/reminders',
  '/data-entry',
  '/data-entry/users',
  '/data-entry/student-profiles',
  '/data-entry/placement-drives',
  '/data-entry/offers',
];

// Helper to generate 10 unique FAQs based on the path
function generateFAQsForRoute(routePath, screenId) {
  const parts = routePath.split('/').filter(Boolean);
  const mainEntity = parts[parts.length - 1] || 'home';
  const role = parts.length > 1 ? parts[1] : 'user';

  const entityFormatted = mainEntity.replace(/-/g, ' ');

  const templates = [
    { q: `What is the primary purpose of the ${entityFormatted} screen?`, a: `This screen allows a ${role} to view and manage their ${entityFormatted} data efficiently within the platform.` },
    { q: `How do I search or filter records on this screen?`, a: `You can use the search bar at the top or the filter dropdowns to narrow down the ${entityFormatted} list.` },
    { q: `Can I export the data shown here?`, a: `Yes, if export is supported for ${entityFormatted}, an "Export CSV" button will be available at the top right of the table.` },
    { q: `What happens if I encounter an error on the ${entityFormatted} page?`, a: `Please refresh the page. If the issue persists, contact the system administrator and mention screen ID ${screenId}.` },
    { q: `Is the data on this screen real-time?`, a: `Yes, the ${entityFormatted} data is fetched directly from the database and reflects the most recent updates.` },
    { q: `How do I update an entry here?`, a: `Click on the 'Edit' icon next to the specific ${entityFormatted} record to modify its details.` },
    { q: `Are deleted ${entityFormatted} permanently removed?`, a: `Usually, deletions are permanent unless an archive feature is explicitly stated for ${entityFormatted}.` },
    { q: `Why can't I see certain ${entityFormatted}?`, a: `Your access is scoped to your role (${role}). You will only see ${entityFormatted} assigned to your specific tenant or profile.` },
    { q: `Is this screen mobile-friendly?`, a: `Yes, the ${entityFormatted} layout is responsive and will adapt to smaller screens like smartphones or tablets.` },
    { q: `How do I navigate back to the main dashboard from here?`, a: `You can click the "Home" icon in the sidebar or use the breadcrumb navigation at the top of the ${entityFormatted} page.` }
  ];

  // Make it slightly more specific if we detect certain keywords
  if (mainEntity === 'applications') {
    templates[0].q = 'How do I check the status of my application?';
    templates[0].a = 'The status is shown as a badge (e.g., Pending, Shortlisted, Rejected) next to each application row.';
  } else if (mainEntity === 'drives') {
    templates[0].q = 'How do I apply for a placement drive?';
    templates[0].a = 'Click the "Apply" button on the active drive card. Ensure you meet the eligibility criteria first.';
  } else if (mainEntity === 'interviews') {
    templates[0].q = 'Where can I find the meeting link for online interviews?';
    templates[0].a = 'The meeting link is provided in the interview details card on this screen.';
  }

  return templates;
}

function buildHTML() {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PlacementHub - Screen FAQs</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; line-height: 1.6; }
  h1 { text-align: center; color: #0f172a; margin-bottom: 40px; }
  .screen-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .screen-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px; }
  .screen-title { font-size: 1.25rem; font-weight: 600; color: #334155; margin: 0; }
  .screen-tag { background: #6366f1; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.875rem; font-weight: bold; }
  .faq-item { margin-bottom: 16px; }
  .faq-q { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
  .faq-a { color: #475569; font-size: 0.95rem; margin-top: 0; }
</style>
</head>
<body>
<h1>PlacementHub - Screen FAQs</h1>
`;

  ROUTES_SORTED.forEach((route, index) => {
    const screenId = `S-${index + 1}`;
    const faqs = generateFAQsForRoute(route, screenId);

    html += `<div class="screen-section">
      <div class="screen-header">
        <h2 class="screen-title">Path: <code>${route}</code></h2>
        <span class="screen-tag">${screenId}</span>
      </div>
      <div class="faq-list">
`;

    faqs.forEach((faq, i) => {
      html += `        <div class="faq-item">
          <div class="faq-q">Q${i + 1}. ${faq.q}</div>
          <p class="faq-a"><strong>A:</strong> ${faq.a}</p>
        </div>
`;
    });

    html += `      </div>
    </div>
`;
  });

  html += `</body>
</html>`;

  return html;
}

const outPath = process.argv[2] || path.join(REPO_ROOT, 'prompts', 'FAQs.html');
const outputDir = path.dirname(outPath);

try {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outPath, buildHTML(), 'utf8');
  console.log('FAQs generated successfully at', outPath);
} catch (err) {
  console.error(`Failed to write FAQs to ${outPath}: ${err.message}`);
  process.exit(1);
}
