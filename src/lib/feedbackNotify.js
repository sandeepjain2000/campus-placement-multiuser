import { notifyUsersOneAtATime } from '@/lib/notificationService';
import { sendMail } from '@/lib/mailer';

/**
 * Notify the feedback submitter about a super-admin reply (in-app + email).
 * Failures are logged but do not fail the reply API.
 */
export async function notifyFeedbackReply({
  submitterUserId,
  submitterEmail,
  submitterName,
  feedbackTitle,
  replyMessage,
}) {
  const title = feedbackTitle ? `Reply: ${feedbackTitle}` : 'Reply to your feedback';
  const preview =
    String(replyMessage || '').trim().slice(0, 500) ||
    'The platform team posted a response in your feedback thread.';

  if (submitterUserId) {
    try {
      await notifyUsersOneAtATime([submitterUserId], {
        title,
        message: preview,
        type: 'info',
        link: '/dashboard/feedback',
      });
    } catch (e) {
      console.error('notifyFeedbackReply: in-app notification failed', e);
    }
  }

  if (submitterEmail) {
    try {
      const greeting = submitterName ? `Hi ${submitterName},` : 'Hi,';
      await sendMail({
        to: submitterEmail,
        subject: title,
        text: `${greeting}\n\nThe PlacementHub team replied to your feedback:\n\n${preview}\n\nSign in to view the full thread: ${process.env.NEXTAUTH_URL || ''}/dashboard/feedback`,
        html: `<p>${greeting}</p><p>The PlacementHub team replied to your feedback:</p><blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#334155">${preview.replace(/\n/g, '<br>')}</blockquote><p><a href="${process.env.NEXTAUTH_URL || ''}/dashboard/feedback">View your feedback</a></p>`,
        context: 'feedback_reply',
        recipientUserId: submitterUserId || undefined,
      });
    } catch (e) {
      console.error('notifyFeedbackReply: email failed', e);
    }
  }
}
