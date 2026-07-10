import { redirect } from 'next/navigation';

/** Legacy URL — Developer notes live on /developer */
export default function DeveloperNotesRedirectPage() {
  redirect('/developer#cleanup');
}
