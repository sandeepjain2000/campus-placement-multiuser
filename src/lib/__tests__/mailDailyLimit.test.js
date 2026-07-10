const { getSmtpDailySendLimit, DEFAULT_SMTP_DAILY_SEND_LIMIT } = require('@/lib/mailDailyLimit');

describe('getSmtpDailySendLimit', () => {
  const prev = process.env.SMTP_DAILY_SEND_LIMIT;

  afterEach(() => {
    if (prev === undefined) delete process.env.SMTP_DAILY_SEND_LIMIT;
    else process.env.SMTP_DAILY_SEND_LIMIT = prev;
  });

  it('defaults to 30 when env is unset', () => {
    delete process.env.SMTP_DAILY_SEND_LIMIT;
    expect(getSmtpDailySendLimit()).toBe(DEFAULT_SMTP_DAILY_SEND_LIMIT);
  });

  it('honours a positive override', () => {
    process.env.SMTP_DAILY_SEND_LIMIT = '50';
    expect(getSmtpDailySendLimit()).toBe(50);
  });

  it('disables the cap when set to 0 or unlimited', () => {
    process.env.SMTP_DAILY_SEND_LIMIT = '0';
    expect(getSmtpDailySendLimit()).toBeNull();
    process.env.SMTP_DAILY_SEND_LIMIT = 'unlimited';
    expect(getSmtpDailySendLimit()).toBeNull();
  });
});
