/** True when Postgres rejects SQL because offers.reported_company_name is missing (run migration 018). */
export function isMissingReportedCompanyColumnError(e) {
  const msg = String(e?.message || '');
  return e?.code === '42703' && msg.includes('reported_company_name');
}
