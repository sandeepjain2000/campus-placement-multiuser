/**
 * Central email service — render React Email templates, deliver via mailer (Zepto → Gmail).
 */
import React from 'react';
import { render } from '@react-email/render';

/**
 * @param {import('react').ComponentType<any> | React.ReactElement} component
 * @param {Record<string, unknown>} [props]
 * @returns {Promise<{ html: string, text: string }>}
 */
export async function renderEmail(component, props = {}) {
  const element = React.isValidElement(component)
    ? component
    : React.createElement(component, props);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}

/**
 * Render a template and send through the shared transport (ZeptoMail primary, Gmail backup).
 * Dynamic-imports mailer to avoid circular deps with send* helpers re-exported from mailer.
 * @param {{
 *   template?: import('react').ComponentType<any>,
 *   props?: Record<string, unknown>,
 *   to: string | string[],
 *   subject: string,
 *   text?: string,
 *   html?: string,
 *   context?: string,
 *   userId?: string,
 *   recipientUserId?: string,
 *   replyTo?: string,
 *   skipCommunicationRouting?: boolean,
 *   skipRecipientRedirect?: boolean,
 * }} opts
 */
export async function dispatchTemplatedEmail(opts) {
  const { template, props = {}, text: textOverride, html: htmlOverride, ...mailOpts } = opts;
  let html = htmlOverride;
  let text = textOverride;
  if (template && (html == null || text == null)) {
    const rendered = await renderEmail(template, props);
    html = html ?? rendered.html;
    text = text ?? rendered.text;
  }
  const { sendMail } = await import('@/lib/mailer');
  return sendMail({
    ...mailOpts,
    html,
    text: text || '',
  });
}

/** @deprecated Prefer dispatchTemplatedEmail — kept for plain/custom bodies. */
export async function dispatchEmail(opts) {
  const { sendMail } = await import('@/lib/mailer');
  return sendMail(opts);
}
