import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import PreventWheelOnNumberInputs from '@/components/PreventWheelOnNumberInputs';

export const metadata = {
  title: 'PlacementHub — Campus Placement & Engagement Platform',
  description: 'A SaaS platform connecting students, employers, and colleges for seamless campus recruitment. Manage placement drives, job postings, applications, and offers in one place.',
  keywords: 'campus placement, recruitment, hiring, college placements, job portal, SaaS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <PreventWheelOnNumberInputs />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
