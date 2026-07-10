'use client';

import Link from 'next/link';
import { setLoginPrefillEmail } from '@/lib/loginClient';

/**
 * Navigate to /login and prefill email once via sessionStorage (not ?email= in the URL).
 * Stops the address bar from sticking on admin@iitm.edu and fighting saved-password picks.
 */
export default function DemoAccountLoginLink({ email, href = '/login', children, ...rest }) {
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        setLoginPrefillEmail(email);
        if (typeof rest.onClick === 'function') rest.onClick(e);
      }}
    >
      {children}
    </Link>
  );
}
