import { redirect } from 'next/navigation';

/** CSV offer import removed — use manual Add offer on Placement offers. */
export default function CollegeOffersUploadPage() {
  redirect('/dashboard/college/offers');
}
