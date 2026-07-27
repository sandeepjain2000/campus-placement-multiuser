import { Button, Section, Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * @param {{
 *   firstName?: string,
 *   companyName: string,
 *   roleTitle: string,
 *   ctcLine?: string,
 *   deadlineText?: string,
 *   letterHtml?: string,
 *   letterUrl?: string,
 *   offersLink: string,
 *   offerId?: string,
 * }} props
 */
export function OfferLetterEmail({
  firstName = 'there',
  companyName,
  roleTitle,
  ctcLine,
  deadlineText,
  letterHtml,
  letterUrl,
  offersLink,
  offerId,
}) {
  return (
    <PlacementHubLayout
      preview={`Formal offer — ${roleTitle} at ${companyName}`}
      title="Formal offer issued"
      headerBg={emailStyles.brand.indigo}
      headerColor="#ffffff"
      footerNote={`PlacementHub — formal offer notification${offerId ? ` (ref ${offerId})` : ''}.`}
    >
      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        <strong>{companyName}</strong> has issued a <strong>formal offer</strong> for{' '}
        <strong>{roleTitle}</strong>.
      </Text>
      <Text style={emailStyles.callout}>
        This is separate from your earlier selection update. The formal offer includes compensation
        terms and requires your accept or decline response in PlacementHub.
      </Text>
      {!letterHtml && ctcLine ? (
        <Text style={emailStyles.paragraph}>
          <strong>CTC:</strong> {ctcLine}
        </Text>
      ) : null}
      {deadlineText ? (
        <Text style={emailStyles.paragraph}>
          <strong>Respond by:</strong> {deadlineText}
        </Text>
      ) : null}
      {letterHtml ? (
        <Text style={emailStyles.callout}>{letterHtml}</Text>
      ) : letterUrl ? (
        <Section style={{ textAlign: 'center', margin: '16px 0' }}>
          <Button
            href={letterUrl}
            style={{ ...emailStyles.button, backgroundColor: '#0f766e' }}
          >
            Download offer letter
          </Button>
        </Section>
      ) : (
        <Text style={emailStyles.muted}>
          Your offer letter is available on PlacementHub under My Offers.
        </Text>
      )}
      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Button href={offersLink} style={emailStyles.button}>
          Review on My Offers
        </Button>
      </Section>
    </PlacementHubLayout>
  );
}
