import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  buildContentSecurityPolicy,
  buildSecurityHeaderList,
} from './securityHeaders.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const gitShort =
  process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.length >= 7
    ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : '';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Canonical app origin for CORS (overrides Vercel’s default ACAO:* on static assets).
 * Prefer explicit public URL; fall back to Vercel production / deployment host.
 */
function resolveAppOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv.startsWith('http://') || fromEnv.startsWith('https://')) return fromEnv;
  const prodHost = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
    .trim()
    .replace(/^https?:\/\//, '');
  if (prodHost) return `https://${prodHost}`;
  const deployHost = String(process.env.VERCEL_URL || '')
    .trim()
    .replace(/^https?:\/\//, '');
  if (deployHost) return `https://${deployHost}`;
  return 'https://campus-placement-omega.vercel.app';
}

const APP_ORIGIN = resolveAppOrigin();
/** Baseline CSP for static assets (no per-request nonce; no unsafe-inline / unsafe-eval in production). */
const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy({ isDev: !isProd });

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: isProd
    ? {
        removeConsole: { exclude: ['error'] },
      }
    : undefined,
  // Tree-shake lucide icon imports (reduces unused JS).
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
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
  // Vercel omits App Router routes whose path contains a `cvs/` or `logs/` segment.
  // beforeFiles: rewrite before filesystem routes so legacy paths never 404 as missing handlers.
  async rewrites() {
    return {
      beforeFiles: [
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
        { source: '/api/audit/logs', destination: '/api/audit/log-entries' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Compress responses (gzip/brotli on Node/Vercel). Default is true; keep explicit for clarity.
  compress: true,
  // Do not expose X-Powered-By.
  poweredByHeader: false,
  async headers() {
    // Non-CSP headers on all routes. CSP for HTML documents is set per-request in
    // middleware with a fresh nonce (two CSP headers would AND and break scripts).
    const securityHeaders = buildSecurityHeaderList({ isProd, appOrigin: APP_ORIGIN });

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Static chunks: baseline CSP (no nonce) + CORS lock (ZAP flagged ACAO:*).
        source: '/_next/static/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: APP_ORIGIN },
          { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
