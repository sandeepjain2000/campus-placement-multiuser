'use client';
import { useEffect, useMemo, useState } from 'react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { ClipboardList, Users, Upload, Download, Search, Building2 } from 'lucide-react';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function mb_HiringAssessment() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch('/api/college/hiring-assessment-view');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        setLoadError(e?.message || 'Could not load assessment data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const displayRows = useMemo(() => pickRepresentativeAssessmentRows(rows), [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return displayRows.slice(0, 50);
    return displayRows.filter(r =>
      (r.candidate_name && r.candidate_name.toLowerCase().includes(q)) ||
      (r.roll_number && r.roll_number.toLowerCase().includes(q)) ||
      (r.employer_company && r.employer_company.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [displayRows, searchQuery]);

  const summary = payload?.summary || buildAssessmentSummary(rows);

  const downloadOffersImportStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Template downloaded successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  return (
    <>
      <MobileHeader
        title="Hiring Assessment"
        action={
          <Button variant="ghost" size="icon-sm" onClick={downloadOffersImportStarter} aria-label="Download all students template"><Download /></Button>
        }
      />
      <div className="animate-fadeIn px-4 pt-4 pb-20">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((item) => <div key={item} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : loadError ? (
          <Alert variant="destructive"><AlertTitle>Could not load assessment data</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="flex flex-col gap-3">
              {[
                { label: 'Total students', value: summary.uniqueStudentCount ?? 0, description: summary.totalResultRows > 0 ? `${summary.totalResultRows} upload rows` : '', icon: Users },
                { label: 'Upload batches', value: summary.uploadsCount, description: '', icon: Upload },
                { label: 'With hiring result', value: summary.withHiringResult ?? 0, description: summary.withoutHiringResult ? `${summary.withoutHiringResult} pending` : '', icon: ClipboardList },
              ].map(({ label, value, description, icon: Icon }) => (
                <Card key={label} className="py-4"><CardContent className="flex items-center gap-4 px-4"><Icon className="text-muted-foreground size-6" /><div><div className="text-xl font-semibold">{value}</div><CardTitle className="text-sm">{label}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</div></CardContent></Card>
              ))}
            </TabsContent>
            <TabsContent value="results">
              <div className="overflow-x-auto pb-2">
                <HiringResultBreakdown summary={summary} />
              </div>
            </TabsContent>
            <TabsContent value="students" className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Search name, roll, or company..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {filteredRows.map((r) => {
                    const result = String(r.hiring_result || '').trim() || 'No decision';
                    const lk = result.toLowerCase();
                    const isSuccess = lk.includes('select') || lk.includes('shortlist');
                    const isFail = lk.includes('reject') || lk.includes('decline') || lk.includes('withdraw');
                    return (
                      <Card key={r.id} className="gap-3 py-4">
                        <CardHeader className="flex-row items-start justify-between gap-2 px-4">
                          <div>
                            <CardTitle className="text-sm">{r.candidate_name || '—'}</CardTitle>
                            <CardDescription className="font-mono">{r.roll_number}</CardDescription>
                          </div>
                          <StatusBadge tone={isSuccess ? 'success' : isFail ? 'danger' : 'info'}>{result || '—'}</StatusBadge>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm"><Building2 className="size-3.5" />{r.employer_company || '—'}</div>
                        {r.remarks && (
                          <p className="bg-muted text-muted-foreground rounded-md p-2 text-xs"><strong>Remarks:</strong> {r.remarks}</p>
                        )}
                        <div className="text-muted-foreground border-t pt-2 text-right text-xs">From: {r.original_file_name || '—'}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <Card className="border-dashed"><CardContent className="text-muted-foreground py-8 text-center text-sm">No assessment records found.</CardContent></Card>
                  )}
                  {filteredRows.length === 50 && (
                    <p className="text-muted-foreground text-center text-xs">Showing first 50 results. Use search to find specific students.</p>
                  )}
                </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
