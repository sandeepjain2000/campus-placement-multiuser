/** Marketplace catalog helpers — providers, services, buyer orders. */

export const MARKETPLACE_CATEGORIES = [
  { value: 'aptitude_tests', label: 'Aptitude Tests' },
  { value: 'coding_assessments', label: 'Coding Assessments' },
  { value: 'proctoring', label: 'Proctoring' },
  { value: 'training', label: 'Training & Prep' },
  { value: 'career_services', label: 'Career Services' },
  { value: 'other', label: 'Other' },
];

export const MARKETPLACE_BILLING_UNITS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'per_batch', label: 'Per batch' },
  { value: 'per_student', label: 'Per student' },
  { value: 'per_month', label: 'Per month' },
  { value: 'per_year', label: 'Per year' },
];

export const MARKETPLACE_ORDER_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function marketplaceCategoryLabel(value) {
  return MARKETPLACE_CATEGORIES.find((c) => c.value === value)?.label || value || 'Other';
}

export function marketplaceBillingLabel(value) {
  return MARKETPLACE_BILLING_UNITS.find((b) => b.value === value)?.label || value || 'One-time';
}

export function marketplaceOrderStatusLabel(value) {
  return MARKETPLACE_ORDER_STATUSES.find((s) => s.value === value)?.label || value || '—';
}

export function marketplaceOrderStatusBadge(value) {
  switch (value) {
    case 'requested':
      return 'amber';
    case 'confirmed':
      return 'blue';
    case 'fulfilled':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
}

export function formatMarketplacePriceInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function mapMarketplaceProvider(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'other',
    categoryLabel: marketplaceCategoryLabel(row.category),
    tagline: row.tagline || '',
    description: row.description || '',
    website: row.website || '',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    logoUrl: row.logo_url || '',
    active: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serviceCount: row.service_count != null ? Number(row.service_count) : undefined,
  };
}

export function mapMarketplaceService(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name || '',
    providerCategory: row.provider_category || '',
    providerCategoryLabel: marketplaceCategoryLabel(row.provider_category),
    title: row.title,
    description: row.description || '',
    priceInr: Number(row.price_inr || 0),
    priceLabel: formatMarketplacePriceInr(row.price_inr),
    billingUnit: row.billing_unit || 'one_time',
    billingLabel: marketplaceBillingLabel(row.billing_unit),
    availableToCollege: row.available_to_college !== false,
    availableToEmployer: row.available_to_employer !== false,
    published: Boolean(row.is_published),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    providerActive: row.provider_active !== false,
  };
}

export function mapMarketplaceOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    serviceId: row.service_id,
    providerId: row.provider_id,
    serviceTitle: row.service_title || '',
    providerName: row.provider_name || '',
    buyerRole: row.buyer_role,
    tenantId: row.tenant_id || null,
    employerId: row.employer_id || null,
    buyerOrgName: row.buyer_org_name || '',
    buyerUserId: row.buyer_user_id,
    buyerEmail: row.buyer_email || '',
    status: row.status,
    statusLabel: marketplaceOrderStatusLabel(row.status),
    statusBadge: marketplaceOrderStatusBadge(row.status),
    quantity: Number(row.quantity || 1),
    unitPriceInr: Number(row.unit_price_inr || 0),
    priceLabel: formatMarketplacePriceInr(
      Number(row.unit_price_inr || 0) * Number(row.quantity || 1),
    ),
    currency: row.currency || 'INR',
    buyerNotes: row.buyer_notes || '',
    adminNotes: row.admin_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validateMarketplaceProviderInput(body) {
  const name = String(body?.name || '').trim();
  if (!name) return { ok: false, error: 'Provider name is required' };
  if (name.length > 200) return { ok: false, error: 'Provider name is too long' };

  const category = String(body?.category || 'other').trim() || 'other';
  if (!MARKETPLACE_CATEGORIES.some((c) => c.value === category)) {
    return { ok: false, error: 'Invalid provider category' };
  }

  return {
    ok: true,
    value: {
      name,
      category,
      tagline: String(body?.tagline || '').trim().slice(0, 300),
      description: String(body?.description || '').trim(),
      website: String(body?.website || '').trim().slice(0, 500),
      contactEmail: String(body?.contactEmail || body?.contact_email || '')
        .trim()
        .toLowerCase()
        .slice(0, 255),
      contactPhone: String(body?.contactPhone || body?.contact_phone || '')
        .trim()
        .slice(0, 40),
      logoUrl: String(body?.logoUrl || body?.logo_url || '').trim(),
      active: body?.active === undefined && body?.is_active === undefined
        ? true
        : Boolean(body?.active ?? body?.is_active),
    },
  };
}

export function validateMarketplaceServiceInput(body) {
  const providerId = String(body?.providerId || body?.provider_id || '').trim();
  if (!providerId) return { ok: false, error: 'Provider is required' };

  const title = String(body?.title || '').trim();
  if (!title) return { ok: false, error: 'Service title is required' };
  if (title.length > 200) return { ok: false, error: 'Service title is too long' };

  const priceRaw = body?.priceInr ?? body?.price_inr ?? 0;
  const priceInr = Number(priceRaw);
  if (!Number.isFinite(priceInr) || priceInr < 0) {
    return { ok: false, error: 'Price must be a non-negative number' };
  }

  const billingUnit = String(body?.billingUnit || body?.billing_unit || 'one_time').trim();
  if (!MARKETPLACE_BILLING_UNITS.some((b) => b.value === billingUnit)) {
    return { ok: false, error: 'Invalid billing unit' };
  }

  return {
    ok: true,
    value: {
      providerId,
      title,
      description: String(body?.description || '').trim(),
      priceInr,
      billingUnit,
      availableToCollege:
        body?.availableToCollege === undefined && body?.available_to_college === undefined
          ? true
          : Boolean(body?.availableToCollege ?? body?.available_to_college),
      availableToEmployer:
        body?.availableToEmployer === undefined && body?.available_to_employer === undefined
          ? true
          : Boolean(body?.availableToEmployer ?? body?.available_to_employer),
      published: Boolean(body?.published ?? body?.is_published),
      sortOrder: Number.parseInt(String(body?.sortOrder ?? body?.sort_order ?? 0), 10) || 0,
    },
  };
}
