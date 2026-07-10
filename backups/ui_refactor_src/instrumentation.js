export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { assertNextAuthSecretIfProduction } = await import('./lib/assertAuthEnv.js');
  assertNextAuthSecretIfProduction();
}
