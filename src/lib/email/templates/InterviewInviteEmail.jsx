import { Text } from '@react-email/components';
import { PlacementHubLayout, emailStyles } from './PlacementHubLayout';

/**
 * @param {{
 *   recipientName?: string,
 *   companyName: string,
 *   campusName?: string,
 *   openingTitle: string,
 *   kindLabel: string,
 *   round?: string,
 *   dateLabel: string,
 *   timeLabel: string,
 *   mode?: string,
 *   panelNames?: string,
 *   disclaimer: string,
 * }} props
 */
export function InterviewInviteEmail({
  recipientName,
  companyName,
  campusName = 'your campus',
  openingTitle,
  kindLabel,
  round = 'Interview',
  dateLabel,
  timeLabel,
  mode = 'Virtual',
  panelNames,
  disclaimer,
}) {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  return (
    <PlacementHubLayout
      preview={`Interview window — ${openingTitle}`}
      title="Interview schedule"
      headerBg={emailStyles.brand.indigo}
      headerColor="#ffffff"
    >
      <Text style={emailStyles.paragraph}>{greeting}</Text>
      <Text style={emailStyles.paragraph}>
        <strong>{companyName}</strong> has shared an interview window for applicants on{' '}
        <strong>{openingTitle}</strong> ({kindLabel}) at {campusName}.
      </Text>
      <Text style={emailStyles.callout}>
        <strong>Interview window (indicative)</strong>
        <br />
        Round: {round}
        <br />
        Date: {dateLabel}
        <br />
        Time: {timeLabel}
        <br />
        Mode: {mode}
        {panelNames ? (
          <>
            <br />
            Panel / interviewer: {panelNames}
          </>
        ) : null}
      </Text>
      <Text style={emailStyles.muted}>{disclaimer}</Text>
      <Text style={emailStyles.paragraph}>
        Please watch for a separate message with your confirmed slot and joining details.
      </Text>
    </PlacementHubLayout>
  );
}
