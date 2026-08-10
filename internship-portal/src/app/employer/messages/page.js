'use client';

import MessagesInbox from '@/components/ip/MessagesInbox';
import PageHeader from '@/components/ip/PageHeader';

export default function EmployerMessagesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Conversations with candidates about applications and invites."
      />
      <MessagesInbox role="employer" />
    </div>
  );
}
