const fs = require('fs');
const path = require('path');

const BACKUP_DIR_NAME = 'login_backup_2026-06-11';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_ROOT = path.join(PROJECT_ROOT, 'backups', BACKUP_DIR_NAME);

// List of login/auth files to back up
const filesToBackup = [
    // Core login page & config
    'src/app/login/page.js',
    'src/components/SessionLifetimeGuard.jsx',
    'src/lib/sessionPolicy.js',
    'src/components/AuthProvider.js',
    'src/middleware.js',
    'src/app/auth/continue/route.js',
    'src/app/api/auth/[...nextauth]/route.js',
    'src/lib/auth.js',
    
    // Captcha elements
    'src/components/auth/LoginCaptchaField.jsx',
    'src/lib/simpleCaptcha.js',
    'src/lib/loginClient.js',
    'src/app/api/auth/captcha/route.js',
    'src/app/api/auth/captcha/verify/route.js',
    
    // Navigation / Signout / Layout elements modified in the login/logout fix
    'src/components/mobile/MobileHamburgerMenu.jsx',
    'src/components/DashboardFullScreenHub.jsx',
    'src/app/dashboard/layout.js',
    'src/components/NotificationDropdown.jsx',
    
    // Demo accounts info
    'src/components/auth/DemoAccountLoginLink.jsx',
    'src/lib/demoLogins.js'
];

console.log(`Starting backup of login-related files...`);
console.log(`Project root: ${PROJECT_ROOT}`);
console.log(`Backup destination: ${BACKUP_ROOT}`);

if (!fs.existsSync(BACKUP_ROOT)) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
}

let successCount = 0;
let failCount = 0;

filesToBackup.forEach(relPath => {
    const srcPath = path.join(PROJECT_ROOT, relPath);
    const destPath = path.join(BACKUP_ROOT, relPath);
    
    if (fs.existsSync(srcPath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`[SUCCESS] Copied: ${relPath}`);
        successCount++;
    } else {
        console.warn(`[WARNING] File not found: ${relPath}`);
        failCount++;
    }
});

// Create a README in the backup folder to document it
const readmeContent = `# Login Code Backup

Created on: ${new Date().toISOString()}
Purpose: Backup of all login-related code and components implementing the permanent fix for the double-login requirement bug.

## Backed Up Files:
${filesToBackup.map(f => `- [${fs.existsSync(path.join(PROJECT_ROOT, f)) ? 'x' : ' '}] ${f}`).join('\n')}

---
**Warning:** This backup serves as a reference/restore point for authentication logic. Do not modify the active login/session files needlessly.
`;

fs.writeFileSync(path.join(BACKUP_ROOT, 'README.md'), readmeContent, 'utf8');
console.log(`[SUCCESS] Created README.md in backup directory.`);

console.log(`\nBackup Complete: ${successCount} succeeded, ${failCount} failed.`);
