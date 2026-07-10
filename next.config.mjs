import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const gitShort =
  process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.length >= 7
    ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : '';

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: isProd
    ? {
        removeConsole: { exclude: ['error'] },
      }
    : undefined,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version || '0.1.0',
    NEXT_PUBLIC_APP_GIT_SHA: gitShort,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || '',
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID || '',
  },
  // Parent folder also has a package-lock.json; without this, Turbopack picks the wrong
  // workspace root and can crawl huge sibling folders (very slow / appears to hang).
  turbopack: {
    root: __dirname,
  },
  // Hide Next.js corner "N" dev menu — it looks like our test N and blocks clicks.
  devIndicators: false,
  // Allow mobile devices on the local network to connect for testing.
  // NEXTAUTH_URL and NEXT_PUBLIC_APP_URL in .env.local must also be updated
  // to your LAN IP for session cookies to work.
  allowedDevOrigins: ['127.0.0.1', '192.168.1.102'],
  // Helps dev/SSR reliably resolve `next-auth` subpath exports (`next-auth/react`).
  transpilePackages: ['next-auth'],
  serverExternalPackages: ['pdf-parse', 'mammoth', 'pg', 'pg-connection-string'],
  async redirects() {
    return [
      {
        source: '/dashboard/student/cvs',
        destination: '/dashboard/student/my-cvs',
        permanent: true,
      },
    ];
  },
  // Vercel omits App Router routes whose path contains a `cvs/` segment (introduced with multi-CV).
  // Rewrite legacy URLs to production-safe aliases so bookmarks and older clients keep working.
  async rewrites() {
    return [
      { source: '/api/student/cvs', destination: '/api/student/cv-list' },
      { source: '/api/student/cvs/upload', destination: '/api/student/cv-upload' },
      { source: '/api/student/cvs/:id/view', destination: '/api/student/cv-view/:id' },
      { source: '/api/student/cvs/:id', destination: '/api/student/cv-item/:id' },
      {
        source: '/api/college/students/:id/cvs/:cvId/verify',
        destination: '/api/college/students/:id/student-cv-verify/:cvId',
      },
      {
        source: '/api/college/students/:id/cvs',
        destination: '/api/college/students/:id/student-cv-list',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
