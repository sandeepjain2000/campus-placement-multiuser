export const EMPLOYER_OFFERS_CSV_TEMPLATE = `roll_number,tenant_id,job_title,salary,location,joining_date,deadline,drive_id,status
CS2021001,,Software Development Engineer,1500000,Bangalore,2026-07-01,2026-05-15,,accepted
`;

export const EMPLOYER_OFFERS_TEMPLATE_FILENAME = 'employer_offers_import_template.csv';

export function downloadEmployerOffersTemplate() {
  const blob = new Blob([EMPLOYER_OFFERS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = EMPLOYER_OFFERS_TEMPLATE_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
