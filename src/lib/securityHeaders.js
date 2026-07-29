/**
 * Re-export shared HTTP security headers + CSP builders.
 * Canonical implementation: /securityHeaders.mjs (imported by next.config.mjs).
 */
export {
  buildContentSecurityPolicy,
  buildSecurityHeaderList,
  applySecurityHeaders,
} from '../../securityHeaders.mjs';
