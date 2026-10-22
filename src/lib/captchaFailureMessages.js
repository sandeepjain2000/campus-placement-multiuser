/** Shown on sign-in when the captcha check fails. The check itself is unchanged. */
export const CAPTCHA_FAILURE_MESSAGES = {
  missing_answer: 'Enter the answer to the question.',
  wrong_answer: 'That answer does not match the question. Try again.',
  expired:
    'This question has expired. Click the refresh button beside Verification, then answer the new question.',
  bad_token:
    'Verification could not be checked. Click the refresh button beside Verification, then answer the new question.',
};

export function captchaFailureMessage(code) {
  return CAPTCHA_FAILURE_MESSAGES[code] || CAPTCHA_FAILURE_MESSAGES.bad_token;
}

/** These sentences tell the person to retry or press refresh, so the page leaves the current question in place. */
export function captchaErrorKeepsQuestion(message) {
  const text = String(message || '');
  return Object.values(CAPTCHA_FAILURE_MESSAGES).some((sentence) => text.includes(sentence));
}
