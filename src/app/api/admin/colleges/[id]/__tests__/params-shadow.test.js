/**
 * Regression: naming SQL bind arrays `params` inside a try block of a handler that
 * also receives Next.js route `{ params }` causes TDZ
 * ("Cannot access 'params' before initialization"), so every college profile save
 * (including no-op) returned 500 with contradictory "Failed to update" +
 * "Full details were saved" messaging (and Session Diagnostics).
 */
describe('admin college PATCH params shadowing', () => {
  it('does not redeclare route params as the SQL bind array', () => {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'admin',
      'colleges',
      '[id]',
      'route.js',
    );
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/const \{ id \} = await params/);
    expect(src).toMatch(/const queryParams = \[/);
    expect(src).not.toMatch(/const params = \[id,/);
  });

  it('reproduces the TDZ that previously broke PATCH', async () => {
    async function broken({ params }) {
      try {
        const { id } = await params;
        const params = [id];
        return params;
      } catch (e) {
        throw e;
      }
    }

    await expect(broken({ params: Promise.resolve({ id: 'abc' }) })).rejects.toThrow(
      /Cannot access 'params' before initialization/,
    );
  });

  it('succeeds when SQL binds use a different name', async () => {
    async function fixed({ params }) {
      try {
        const { id } = await params;
        const queryParams = [id, 'College'];
        return queryParams;
      } catch (e) {
        throw e;
      }
    }

    await expect(fixed({ params: Promise.resolve({ id: 'abc' }) })).resolves.toEqual([
      'abc',
      'College',
    ]);
  });
});
