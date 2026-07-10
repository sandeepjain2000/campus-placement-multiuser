import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import PreventWheelOnNumberInputs from '@/components/PreventWheelOnNumberInputs';
import GuidedRunnerShell from '@/components/guided/GuidedRunnerShell';
import ClientErrorGuard from '@/components/ClientErrorGuard';

export const metadata = {
  title: 'PlacementHub — Campus Placement & Engagement Platform',
  description: 'A SaaS platform connecting students, employers, and colleges for seamless campus recruitment. Manage placement drives, job postings, applications, and offers in one place.',
  keywords: 'campus placement, recruitment, hiring, college placements, job portal, SaaS',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const themeInitScript = `(function(){try{var k='placementhub_theme',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <ClientErrorGuard />
              <PreventWheelOnNumberInputs />
              <GuidedRunnerShell />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
