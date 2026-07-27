import { Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * @param {{
 *   firstName?: string,
 *   email: string,
 *   tempPass: string,
 *   systemId: string,
 *   collegeName?: string,
 * }} props
 */
export function StudentWelcomeEmail({
  firstName = 'Student',
  email,
  tempPass,
  systemId,
  collegeName,
}) {
  const campus = collegeName ? ` at ${collegeName}` : '';
  return (
    <PlacementHubLayout
      preview="Your PlacementHub account is ready"
      title="Your PlacementHub Account is Ready"
    >
      <Text style={emailStyles.paragraph}>Hello {firstName},</Text>
      <Text style={emailStyles.paragraph}>
        Your college has added you to PlacementHub{campus}. Student self-registration is not used —
        your profile details come from the campus master list.
      </Text>
      <Text style={emailStyles.callout}>
        <strong>Login email:</strong> {email}
        <br />
        <strong>Password:</strong> {tempPass}
        <br />
        <strong>Roll / system ID:</strong> {systemId}
      </Text>
      <Text style={emailStyles.paragraph}>
        Sign in at the PlacementHub login page. You may keep this password; changing it is optional.
      </Text>
      <Text style={emailStyles.muted}>
        If you did not expect this message, contact your placement office.
      </Text>
    </PlacementHubLayout>
  );
}
