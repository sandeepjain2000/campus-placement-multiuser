const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('../lib/repo-root');

const filePath = path.join(REPO_ROOT, 'src', 'app', 'dashboard', 'layout.js');
if (!fs.existsSync(filePath)) {
  console.error(`Target file not found: ${filePath}`);
  process.exit(1);
}

let content;
try {
  content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  console.error(`Failed to read ${filePath}: ${err.message}`);
  process.exit(1);
}

const replacements = {
  "'📊'": "LayoutDashboard",
  "'👤'": "User",
  "'🔔'": "Bell",
  "'🎯'": "Target",
  "'📝'": "FileEdit",
  "'🎉'": "Award",
  "'📄'": "FileText",
  "'🏢'": "Building2",
  "'🎓'": "GraduationCap",
  "'📁'": "FolderDot",
  "'💼'": "Briefcase",
  "'📋'": "ClipboardList",
  "'📨'": "Send",
  "'💎'": "Gem",
  "'💬'": "MessageSquare",
  "'🏛️'": "Building",
  "'📅'": "Calendar",
  "'⚙️'": "Settings",
  "'📈'": "TrendingUp",
  "'🔧'": "Settings",
  "'🏫'": "Building",
  "'👥'": "Users"
};

let totalReplacements = 0;
for (const [emoji, comp] of Object.entries(replacements)) {
  const updated = content.replaceAll(`icon: ${emoji}`, `icon: ${comp}`);
  if (updated !== content) totalReplacements += 1;
  content = updated;
}

if (totalReplacements === 0) {
  console.warn('No emoji replacements were made. File may already be fixed.');
}

try {
  fs.copyFileSync(filePath, `${filePath}.bak`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed menu emojis successfully (${totalReplacements} replacement keys matched).`);
} catch (err) {
  console.error(`Failed to write ${filePath}: ${err.message}`);
  process.exit(1);
}
