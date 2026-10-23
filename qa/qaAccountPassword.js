/** Password for the QA accounts named in QA_*_EMAIL. Not the demo seed password. */
export function qaAccountPassword() {
  const password = String(process.env.DEMO_SEED_PASSWORD || '').trim();
  if (!password) {
    throw new Error(
      'Set DEMO_SEED_PASSWORD to the password for the QA accounts. This runner does not assume the demo seed password.',
    );
  }
  return password;
}
