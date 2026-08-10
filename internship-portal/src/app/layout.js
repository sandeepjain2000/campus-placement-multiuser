import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Internship Portal',
  description: 'Internship Portal — candidates, employers, and SuperAdmin.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const themeInitScript = `(function(){try{var k='placementhub_theme',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ToastProvider>
            <Providers>{children}</Providers>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
