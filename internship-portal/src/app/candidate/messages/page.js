'use client';

import MessagesInbox from '@/components/ip/MessagesInbox';
import PageHeader from '@/components/ip/PageHeader';

export default function CandidateMessagesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Conversations with employers about your applications."
      />
      <MessagesInbox role="candidate" />
    </div>
  );
}
