import { Button, Section, Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * Application received / selection update / generic status.
 * @param {{
 *   variant?: 'submitted' | 'selected' | 'status',
 *   firstName?: string,
 *   title: string,
 *   introHtml?: string,
 *   intro?: string,
 *   rows?: { label: string, value: string }[],
 *   callout?: string,
 *   ctaLabel?: string,
 *   ctaUrl?: string,
 *   footerNote?: string,
 * }} props
 */
export function ApplicationStatusEmail({
  variant = 'status',
  firstName = 'there',
  title,
  intro,
  rows = [],
  callout,
  ctaLabel,
  ctaUrl,
  footerNote,
}) {
  const headerBg =
    variant === 'selected' ? '#10b981' : variant === 'submitted' ? emailStyles.brand.indigo : emailStyles.brand.bg;
  const headerColor = variant === 'selected' || variant === 'submitted' ? '#ffffff' : emailStyles.brand.blue;

  return (
    <PlacementHubLayout
      preview={title}
      title={title}
      headerBg={headerBg}
      headerColor={headerColor}
      footerNote={footerNote}
    >
      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>
      {intro ? <Text style={emailStyles.paragraph}>{intro}</Text> : null}
      {rows.length > 0 ? (
        <Section style={{ margin: '8px 0 20px' }}>
          {rows.map((row) => (
            <Text key={`${row.label}-${row.value}`} style={{ ...emailStyles.muted, margin: '0 0 6px' }}>
              <strong style={{ color: emailStyles.brand.text, display: 'inline-block', minWidth: '100px' }}>
                {row.label}
              </strong>{' '}
              {row.value}
            </Text>
          ))}
        </Section>
      ) : null}
      {callout ? <Text style={emailStyles.callout}>{callout}</Text> : null}
      {ctaUrl && ctaLabel ? (
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={ctaUrl} style={emailStyles.button}>
            {ctaLabel}
          </Button>
        </Section>
      ) : null}
    </PlacementHubLayout>
  );
}
