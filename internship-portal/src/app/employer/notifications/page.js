'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ip/PageHeader';

export default function EmployerNotificationsPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch('/api/ip/notifications');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await fetch('/api/ip/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) });
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        }
      />
      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{n.title}</CardTitle>
                {!n.read_at ? <Badge>New</Badge> : null}
              </div>
              <CardDescription>{n.body}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center gap-3">
              {n.link ? <Link href={n.link} className="text-sm text-primary underline">Open</Link> : null}
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
            </CardContent>
          </Card>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : null}
      </div>
    </div>
  );
}
