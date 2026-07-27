import { Button, Link, Section, Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * @param {{ firstName?: string, resetLink: string }} props
 */
export function PasswordResetEmail({ firstName = 'there', resetLink }) {
  return (
    <PlacementHubLayout preview="Reset your PlacementHub password" title="Password Reset Request">
      <Text style={emailStyles.paragraph}>Hi {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to reset your PlacementHub password. Click the button below to choose
        a new password.
      </Text>
      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Button href={resetLink} style={emailStyles.button}>
          Reset Password
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This link will expire in 1 hour. If you did not request a password reset, you can safely
        ignore this email.
      </Text>
      <Text style={emailStyles.muted}>
        Or open:{' '}
        <Link href={resetLink} style={{ color: emailStyles.brand.indigo, wordBreak: 'break-all' }}>
          {resetLink}
        </Link>
      </Text>
    </PlacementHubLayout>
  );
}
