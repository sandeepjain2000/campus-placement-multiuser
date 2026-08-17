const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        search(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('mail_delivery_logs')) {
        console.log('Found mail_delivery_logs in:', fullPath);
      }
    }
  }
}

search('./src');
console.log('Search completed.');
