'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadClarifications, publishClarificationBatch } from '@/lib/demoClarifications';
import { useToast } from '@/components/ToastProvider';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Building2,
  Download,
  FileText,
  Lightbulb,
  Plus,
  Send,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';

/** Per-company inline question form */
function InlinePostForm({ company, onSuccess }) {
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show, setShow] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setIsSubmitting(true);
    try {
      await publishClarificationBatch({
        company,
        postedBy: 'Student',
        questionTexts: [questionText],
      });
      setQuestionText('');
      setShow(false);
      addToast('Question posted!', 'success');
      onSuccess?.();
    } catch (err) {
      addToast(err.message || 'Failed to post question', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShow(true)}
      >
        <Plus data-icon="inline-start" /> Ask a question
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`clarification-${company}`}>Post a question to {company}</FieldLabel>
          <Textarea id={`clarification-${company}`} name="question" autoComplete="off" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder={`What would you like to ask ${company}?`} rows={3} required />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShow(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !questionText.trim()}><Send data-icon="inline-start" />{isSubmitting ? 'Posting…' : 'Post question'}</Button>
      </div>
    </form>
  );
}

export default function StudentClarificationsPage() {
  const searchParams = useSearchParams();
  const companyFromUrl = String(searchParams.get('company') || '').trim();
  const [data, setData] = useState({ batches: [] });
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState(companyFromUrl);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name'
  const [openBatchIds, setOpenBatchIds] = useState(new Set());

  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return String(d).slice(0, 10); }
  };

  const refresh = useCallback(async () => {
    try {
      const payload = await loadClarifications();
      setData(payload);
    } catch {
      setData({ batches: [] });
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    if (companyFromUrl) setSearch(companyFromUrl);
  }, [companyFromUrl]);

  useEffect(() => {
    if (!companyFromUrl || !data.batches.length) return;
    const match = data.batches.find(
      (b) => b.company.toLowerCase() === companyFromUrl.toLowerCase(),
    );
    if (match) {
      setOpenBatchIds((prev) => new Set(prev).add(match.id));
    }
  }, [companyFromUrl, data.batches]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    let results = q
      ? data.batches.filter(
          (b) =>
            b.company.toLowerCase().includes(q) ||
            b.questions.some((qn) => qn.text.toLowerCase().includes(q)),
        )
      : [...data.batches];

    if (sortBy === 'name') {
      results = results.sort((a, b) => a.company.localeCompare(b.company));
    } else {
      results = results.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }
    setFiltered(results);
  }, [search, sortBy, data.batches]);

  const toggleBatch = (id) => {
    setOpenBatchIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportAsText = (batch) => {
    const lines = [`Clarifications — ${batch.company}`, `Posted by: ${batch.postedBy}`, `Date: ${batch.postedAt}`, ''];
    batch.questions.forEach((q, i) => {
      lines.push(`Q${i + 1}: ${q.text}`);
      lines.push(`A: ${q.answer || 'Awaiting company response.'}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.company.replace(/\s+/g, '_')}_clarifications.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = (batch) => {
    const rows = [['Question', 'Answer', 'Answered By']];
    batch.questions.forEach((q) => {
      rows.push([`"${q.text}"`, `"${q.answer || 'Awaiting response'}"`, `"${q.answeredBy || ''}"`]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.company.replace(/\s+/g, '_')}_clarifications.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fadeIn mx-auto flex max-w-4xl flex-col gap-4">
      <div className="min-w-0">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <MessageSquare className="text-muted-foreground size-7" strokeWidth={1.5} />
          Clarifications
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 text-sm">Read official company Q&amp;A and ask questions directly.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input type="search" name="clarification-search" aria-label="Search clarifications" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies or questions…" />
          </div>
          <div className="flex shrink-0 gap-2" role="group" aria-label="Sort clarifications">
            <Button type="button" size="sm" variant={sortBy === 'date' ? 'secondary' : 'outline'} aria-pressed={sortBy === 'date'} onClick={() => setSortBy('date')}>Recent</Button>
            <Button type="button" size="sm" variant={sortBy === 'name' ? 'secondary' : 'outline'} aria-pressed={sortBy === 'name'} onClick={() => setSortBy('name')}>A–Z</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center"><MessageSquare className="size-8" /><p className="m-0">No clarification threads found{search ? ` for "${search}"` : ''}.</p></CardContent></Card>
        ) : filtered.map((batch) => {
          const isOpen = openBatchIds.has(batch.id);
          const answeredCount = batch.questions.filter((q) => q.answer).length;
          return (
            <Card key={batch.id} className="gap-0 overflow-hidden py-0">
              <button type="button" className="hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-4 text-left outline-none focus-visible:ring-3" aria-expanded={isOpen} onClick={() => toggleBatch(batch.id)}>
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"><Building2 className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{batch.company}</span><span className="text-muted-foreground block text-xs">{formatDate(batch.postedAt)}</span></span>
                <span className="hidden items-center gap-2 sm:flex"><StatusBadge tone="gray">{batch.questions.length} question{batch.questions.length === 1 ? '' : 's'}</StatusBadge>{answeredCount > 0 ? <StatusBadge tone="green" showDot>{answeredCount} answered</StatusBadge> : null}</span>
                {isOpen ? <ChevronUp className="text-muted-foreground size-4" /> : <ChevronDown className="text-muted-foreground size-4" />}
              </button>
              {isOpen ? (
                <CardContent className="flex flex-col gap-5 border-t p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <InlinePostForm company={batch.company} onSuccess={refresh} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => exportAsText(batch)}><FileText data-icon="inline-start" />Text</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => exportAsCsv(batch)}><Download data-icon="inline-start" />CSV</Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {batch.questions.map((q, idx) => (
                      <div key={q.id} className="flex flex-col gap-2">
                        <div className="bg-muted/50 rounded-lg border p-4"><p className="text-muted-foreground mt-0 mb-1 text-xs font-semibold">Q{idx + 1} · {batch.postedBy}</p><p className="m-0 text-sm leading-relaxed">{q.text}</p></div>
                        {q.answer ? <div className="border-primary/20 bg-primary/5 ml-6 rounded-lg border p-4"><p className="text-primary mt-0 mb-1 text-xs font-semibold">{q.answeredBy || batch.company} · Official answer</p><p className="m-0 text-sm leading-relaxed">{q.answer}</p></div> : <p className="text-muted-foreground ml-6 m-0 text-xs">Awaiting response from {batch.company}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Alert><Lightbulb /><AlertTitle>Tip</AlertTitle><AlertDescription>Expand a company to ask a question or export the discussion. Answers appear after the company or placement office responds.</AlertDescription></Alert>
    </div>
  );
}
