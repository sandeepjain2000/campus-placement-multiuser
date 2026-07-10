import { redirect } from 'next/navigation';

/** CSV offer import removed — bulk generation lives on Offers. */
export default function EmployerOffersUploadPage() {
  redirect('/dashboard/employer/offers');
}
