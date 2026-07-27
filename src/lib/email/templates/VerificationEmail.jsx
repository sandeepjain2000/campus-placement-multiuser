import { Button, Link, Section, Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * @param {{ firstName?: string, verifyLink?: string, roleLine?: string }} props
 */
export function VerificationEmail({
  firstName = 'there',
  verifyLink = '',
  roleLine = 'After verification, you can continue with PlacementHub.',
}) {
  return (
    <PlacementHubLayout
      preview="Confirm your PlacementHub registration"
      title="Verify your registration"
    >
      <Text style={emailStyles.paragraph}>Hello {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        Thank you for starting your registration on PlacementHub. Confirm your email address to
        continue.
      </Text>
      {verifyLink ? (
        <>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={verifyLink} style={emailStyles.button}>
              Confirm Email Address
            </Button>
          </Section>
          <Text style={emailStyles.muted}>{roleLine}</Text>
          <Text style={emailStyles.muted}>
            This link is valid for 48 hours. If the button does not work, copy and paste this URL:
            <br />
            <Link href={verifyLink} style={{ color: emailStyles.brand.indigo, wordBreak: 'break-all' }}>
              {verifyLink}
            </Link>
          </Text>
        </>
      ) : (
        <Text style={{ ...emailStyles.paragraph, color: '#dc2626' }}>
          <strong>Note:</strong> Email verification link could not be built (missing NEXTAUTH_URL /
          VERCEL_URL). Please contact your administrator.
        </Text>
      )}
    </PlacementHubLayout>
  );
}
