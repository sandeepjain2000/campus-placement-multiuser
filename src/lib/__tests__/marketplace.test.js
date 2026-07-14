const {
  validateMarketplaceProviderInput,
  validateMarketplaceServiceInput,
  formatMarketplacePriceInr,
  marketplaceCategoryLabel,
} = require('@/lib/marketplace');

describe('marketplace validators', () => {
  it('accepts aptitude test provider', () => {
    const res = validateMarketplaceProviderInput({
      name: 'CampusApt Prep',
      category: 'aptitude_tests',
      tagline: 'Campus assessments',
    });
    expect(res.ok).toBe(true);
    expect(res.value.category).toBe('aptitude_tests');
  });

  it('rejects empty provider name', () => {
    expect(validateMarketplaceProviderInput({ name: '  ' }).ok).toBe(false);
  });

  it('validates service price and provider', () => {
    expect(validateMarketplaceServiceInput({ title: 'Batch', providerId: 'x' }).ok).toBe(true);
    expect(validateMarketplaceServiceInput({ title: 'Batch' }).ok).toBe(false);
    expect(
      validateMarketplaceServiceInput({
        title: 'Batch',
        providerId: 'x',
        priceInr: -5,
      }).ok,
    ).toBe(false);
  });

  it('formats INR and category labels', () => {
    expect(formatMarketplacePriceInr(45000)).toMatch(/45,000/);
    expect(marketplaceCategoryLabel('aptitude_tests')).toBe('Aptitude Tests');
  });
});
