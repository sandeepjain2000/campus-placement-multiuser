export { appOrigin } from '@/lib/email/appOrigin';
export { renderEmail, dispatchTemplatedEmail, dispatchEmail } from '@/lib/email/emailService';
export { sendVerification, sendSignupVerificationEmail } from '@/lib/email/sendVerification';
export {
  sendPasswordReset,
  sendPasswordResetEmail,
  PASSWORD_RESET_SUBJECT,
  passwordResetEmailBodies,
} from '@/lib/email/sendPasswordReset';
export {
  sendStudentWelcome,
  sendStudentWelcomeEmails,
  STUDENT_WELCOME_SUBJECT,
  studentWelcomeEmailBody,
} from '@/lib/email/sendStudentWelcome';
export { sendInterviewInvite } from '@/lib/email/sendInterviewInvite';
export {
  buildEmployerInterviewApplicantEmailSubject,
  buildEmployerInterviewApplicantEmailBody,
  INTERVIEW_TIMEFRAME_DISCLAIMER,
} from '@/lib/employerInterviewEmail';
export {
  sendApplicationStatus,
  sendApplicationSubmitted,
  sendApplicationSelected,
} from '@/lib/email/sendApplicationStatus';
export { sendOfferLetter } from '@/lib/email/sendOfferLetter';
