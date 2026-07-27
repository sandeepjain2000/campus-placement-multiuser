import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

const brand = {
  blue: '#1e3a8a',
  indigo: '#4f46e5',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f8fafc',
  white: '#ffffff',
};

/**
 * Shared PlacementHub transactional email chrome.
 * @param {{ preview?: string, title?: string, headerBg?: string, headerColor?: string, children: import('react').ReactNode, footerNote?: string }} props
 */
export function PlacementHubLayout({
  preview = 'PlacementHub notification',
  title,
  headerBg = brand.bg,
  headerColor = brand.blue,
  children,
  footerNote = 'This is an automated transactional message from PlacementHub. If you did not expect it, you can ignore this email or contact support.',
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {title ? (
            <Section style={{ ...styles.header, backgroundColor: headerBg }}>
              <Text style={{ ...styles.headerTitle, color: headerColor }}>{title}</Text>
            </Section>
          ) : null}
          <Section style={styles.content}>{children}</Section>
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>{footerNote}</Text>
            <Text style={styles.footerBrand}>© PlacementHub. All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  paragraph: {
    margin: '0 0 16px',
    fontSize: '15px',
    lineHeight: '1.55',
    color: brand.text,
  },
  muted: {
    margin: '0 0 12px',
    fontSize: '13px',
    lineHeight: '1.5',
    color: brand.muted,
  },
  button: {
    display: 'inline-block',
    backgroundColor: brand.indigo,
    color: brand.white,
    padding: '12px 24px',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '15px',
  },
  callout: {
    margin: '12px 0 20px',
    padding: '12px 14px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: `1px solid ${brand.border}`,
    fontSize: '14px',
    lineHeight: '1.5',
    color: brand.text,
  },
  brand,
};

const styles = {
  body: {
    backgroundColor: '#f3f4f6',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '24px 12px',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: brand.white,
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '24px',
    borderBottom: `1px solid ${brand.border}`,
    textAlign: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.025em',
  },
  content: {
    padding: '24px',
  },
  hr: {
    borderColor: brand.border,
    margin: '0 24px',
  },
  footer: {
    padding: '16px 24px 24px',
  },
  footerText: {
    margin: '0 0 8px',
    fontSize: '11px',
    lineHeight: '1.45',
    color: '#9ca3af',
  },
  footerBrand: {
    margin: 0,
    fontSize: '11px',
    color: '#9ca3af',
  },
};
