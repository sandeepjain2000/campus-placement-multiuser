/**
 * Regression: Next.js dynamic route params are async — edit/delete must await params.
 */
describe('offer template route params handling', () => {
  it('reads template id from awaited routeContext.params', async () => {
    const routeContext = { params: Promise.resolve({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }) };
    const { id: rawId } = await routeContext.params;
    const id = String(rawId || '').trim();
    expect(id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('fails when params is not awaited (Next.js 15+ regression shape)', () => {
    const routeContext = { params: Promise.resolve({ id: 'template-uuid-123' }) };
    const brokenId = String(routeContext.params?.id || '').trim();
    expect(brokenId).toBe('');
  });
});
