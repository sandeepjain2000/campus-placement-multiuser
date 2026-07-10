import fs from 'fs';
import path from 'path';

const files = [
  'src/app/api/admin/archived-students/[id]/restore/route.js',
  'src/app/api/admin/colleges/[id]/route.js',
  'src/app/api/admin/employers/[id]/route.js',
  'src/app/api/college/drives/[id]/route.js',
  'src/app/api/college/drives/[id]/facebook-post/route.js',
  'src/app/api/college/drives/[id]/report/route.js',
  'src/app/api/college/employers/[employerId]/poc/route.js',
  'src/app/api/college/engagement-listings/[id]/route.js',
  'src/app/api/college/interviews/[id]/route.js',
  'src/app/api/college/message-templates/[id]/route.js',
  'src/app/api/college/students/[id]/route.js',
  'src/app/api/college/students/[id]/resume/route.js',
  'src/app/api/employer/applications/route.js',
  'src/app/api/employer/assessments/import/[sessionId]/route.js',
  'src/app/api/employer/assessments/[uploadId]/route.js',
  'src/app/api/employer/assessments/[uploadId]/audit/route.js',
  'src/app/api/employer/assessments/[uploadId]/rows/route.js',
  'src/app/api/employer/campuses/route.js',
  'src/app/api/employer/dashboard/route.js',
  'src/app/api/employer/drives/[id]/route.js',
  'src/app/api/employer/engagement-listings/[id]/confirmation-draft/route.js',
  'src/app/api/employer/engagement-listings/[id]/send-confirmation/route.js',
  'src/app/api/employer/interviews/[id]/route.js',
  'src/app/api/employer/jobs/route.js',
  'src/app/api/employer/posting-campus-constraints/route.js',
  'src/app/api/employer/profile/route.js',
  'src/app/api/feedback/[id]/route.js',
  'src/app/api/public/jobs/[id]/route.js',
  'src/app/api/public/jobs/[id]/questions/route.js'
];

for (const file of files) {
  const p = path.resolve(file);
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('import { withApiHandlers }') && !content.includes('import {withApiHandlers}')) {
    // If it imports from @/lib/platformErrorRoute, just append withApiHandlers to the import or add a new import line
    const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@\/lib\/platformErrorRoute['"];?/;
    const match = content.match(importRegex);
    if (match) {
        if (!match[1].includes('withApiHandlers')) {
            content = content.replace(importRegex, `import { $1, withApiHandlers } from '@/lib/platformErrorRoute';`);
            fs.writeFileSync(p, content, 'utf8');
            console.log(`Fixed ${file}`);
        }
    } else {
        const importLine = "import { withApiHandlers } from '@/lib/platformErrorRoute';\n";
        content = content.replace(/^(export const dynamic[^\n]*\n)/m, `$1${importLine}`);
        if (!content.includes(importLine)) {
            content = importLine + content;
        }
        fs.writeFileSync(p, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
  }
}
console.log('Done');
