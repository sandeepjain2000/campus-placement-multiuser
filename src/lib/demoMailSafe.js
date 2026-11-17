/**
 * Hard bounce guard for PlacementHub demo / fake inboxes.
 * Runs even when Test environment is No and OUTBOUND_EMAIL_OVERRIDE is unset,
 * so demo-account mail never hits a bounce address (shared ZeptoMail account).
 */

/** Delivery target when a bounce-risk or demo login address would otherwise be used. */
export const DEMO_SAFE_MAIL_INBOX = 'sandeepjain200019@gmail.com';

/**
 * Seed / demo login emails (20 core + related fake campus logins).
 * Mail addressed to these must never leave the app as the SMTP To.
 */
export const DEMO_LOGIN_EMAILS = new Set(
  [
    'arjun.verma@iitm.edu',
    'sneha.rao@nitt.edu',
    'rohan.mehta@bits.edu',
    'priya.sharma.alumni@iitm.edu',
    'hr@techcorp.com',
    'hr@globalsoft.com',
    'hr@infosys.com',
    'talent@innoventlabs.ai',
    'careers@finedge.io',
    'admin@iitm.edu',
    'admin@nitt.edu',
    'admin@bits.edu',
    'committee@iitm.edu',
    'committee@nitt.edu',
    'committee@bits.edu',
    'committee.jadavpur@campus-placement.work',
    'committee.vit@campus-placement.work',
    'committee.dtu@campus-placement.work',
    'committee.iiith@campus-placement.work',
    'admin@placementhub.com',
    'admin.jadavpur@campus-placement.work',
    'admin.vit@campus-placement.work',
    'admin.dtu@campus-placement.work',
    'admin.iiith@campus-placement.work',
  ].map((e) => e.toLowerCase()),
);

/** Known bounce destinations (including wrong communication_email values). */
const BOUNCE_RISK_ADDRESSES = new Set(
  [
    'arjun.verma@iitm.edu',
    'test-notifications@nitt.edu',
    'qa-create-check@placementhub.online',
    'qa-create-check@campus-placement.work',
  ].map((e) => e.toLowerCase()),
);

/** Domains that never receive real delivery from this app. */
const BOUNCE_RISK_DOMAINS = new Set([
  'campus-placement.work',
  'placementhub.test',
]);

function extractEmail(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/<([^<>]+@[^<>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

/**
 * @param {string} address
 * @returns {boolean}
 */
export function isBounceRiskOrDemoLoginAddress(address) {
  const email = extractEmail(address);
  if (!email.includes('@')) return false;
  if (DEMO_LOGIN_EMAILS.has(email)) return true;
  if (BOUNCE_RISK_ADDRESSES.has(email)) return true;
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return BOUNCE_RISK_DOMAINS.has(domain);
}

/**
 * Replace bounce-risk / demo login recipients with DEMO_SAFE_MAIL_INBOX.
 * Unknown real addresses are unchanged.
 * @param {string | string[]} to
 * @returns {string | string[]}
 */
export function rewriteBounceRiskRecipients(to) {
  if (Array.isArray(to)) {
    return to.map((item) => {
      const raw = String(item || '').trim();
      if (!raw) return raw;
      return isBounceRiskOrDemoLoginAddress(raw) ? DEMO_SAFE_MAIL_INBOX : raw;
    });
  }
  if (typeof to === 'string' && to.includes(',')) {
    const parts = to.split(',').map((p) => p.trim()).filter(Boolean);
    return rewriteBounceRiskRecipients(parts).join(', ');
  }
  const raw = String(to || '').trim();
  if (!raw) return to;
  return isBounceRiskOrDemoLoginAddress(raw) ? DEMO_SAFE_MAIL_INBOX : raw;
}
