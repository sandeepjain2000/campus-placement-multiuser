export const COLLEGE_OFFERS_CSV_TEMPLATE = `roll_number,company_name,job_title,salary,location,deadline,status
CS2021001,Example Corp,Software Development Engineer,1500000,Bangalore,2026-05-15,pending
`;

export const COLLEGE_OFFERS_TEMPLATE_FILENAME = 'offers_import_template.csv';

export function downloadCollegeOffersTemplate() {
  const blob = new Blob([COLLEGE_OFFERS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = COLLEGE_OFFERS_TEMPLATE_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
