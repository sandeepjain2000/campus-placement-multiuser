'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function SuperAdminMessagesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/ip/notifications').then((r) => r.json()).then((d) => setItems(d.items || []));
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="Messages & system alerts"
        description="Operational alerts routed to SuperAdmin (new employer registrations, manual requests, feature ideas)."
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Inbox</CardTitle>
          <CardDescription>{items.length} alert(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Body</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {!n.read_at ? <Badge>New</Badge> : null}
                      <span>{n.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[280px] truncate md:table-cell">
                    {n.body}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(n.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {n.link ? (
                      <Button render={<Link href={n.link} />} size="sm" variant="outline">
                        Open
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    No alerts yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
