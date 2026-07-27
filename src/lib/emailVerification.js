import { randomBytes } from 'crypto';

export function newEmailVerificationToken() {
  return randomBytes(32).toString('hex');
}

export {
  sendVerification as sendSignupVerificationEmail,
  sendVerification,
} from '@/lib/email/sendVerification';
