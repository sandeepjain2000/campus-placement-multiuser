'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';

const fetcher = (url) => fetch(url).then((r) => r.json());

const emptyForm = {
  title: '',
  driveType: 'on_campus',
  driveDate: '',
  venue: '',
  description: '',
};

export default function EmployerDrivesPage() {
  const { addToast } = useToast();
  const [activeCampus, setActiveCampus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('activeCampus');
      setActiveCampus(raw ? JSON.parse(raw) : null);
    } catch {
      setActiveCampus(null);
    }
  }, []);

  const swrKey = activeCampus?.id ? `/api/employer/drives?campusId=${activeCampus.id}` : '/api/employer/drives';
  const { data, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: true });

  const drives = Array.isArray(data?.drives) ? data.drives : [];

  const submitDrive = useCallback(async () => {
    if (!activeCampus?.id) {
      addToast('Select an active campus first (workspace home → campus tiles).', 'warning');
      return;
    }
    if (!form.title.trim()) {
      addToast('Drive title is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeCampus.id,
          title: form.title.trim(),
          description: form.description,
          driveType: form.driveType,
          driveDate: form.driveDate || null,
          venue: form.venue,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast(json.error || 'Request failed', 'error');
        return;
      }
      addToast('Drive saved. College admins were notified in the database.', 'success');
      setShowModal(false);
      setForm(emptyForm);
      mutate();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [activeCampus, form, addToast, mutate]);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🎯 My Drives</h1>
          <p>
            Track your campus placement drives.
            {activeCampus ? (
              <>
                {' '}
                Active campus: <strong>{activeCampus.name}</strong>
              </>
            ) : (
              <> Choose a campus from the employer home page to scope this list and request new drives.</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <ExportCsvSplitButton
            mode="dual"
            filenameBase="employer_placement_drives"
            currentCount={drives.length}
            fullCount={drives.length}
            getRows={() => ({
              headers: ['id', 'college', 'title', 'date', 'drive_type', 'status', 'venue', 'registered_count'],
              rows: drives.map((d) => [
                d.id,
                d.college ?? '',
                d.role ?? d.title ?? '',
                d.date ?? '',
                d.type ?? '',
                d.status ?? '',
                d.venue ?? '',
                String(d.registered ?? ''),
              ]),
            })}
          />
          <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}>
            + Request New Drive
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-secondary">Loading drives…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {drives.map((drive) => (
          <div key={drive.id} className="card card-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <EntityLogo name={drive.college} size="sm" shape="rounded" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{drive.college}</h3>
                    <span className={`badge badge-${getStatusColor(drive.status)} badge-dot`}>{formatStatus(drive.status)}</span>
                  </div>
                  <p className="text-sm text-secondary">{drive.role}</p>
                </div>
              </div>
            </div>
            <div className="drive-info-grid" style={{ marginTop: '0.75rem' }}>
              <div className="drive-info-item">
                <div className="drive-info-label">Date</div>
                <div className="drive-info-value">{drive.date ? formatDate(drive.date) : '—'}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Type</div>
                <div className="drive-info-value">
                  <span className={`badge badge-${drive.type === 'virtual' ? 'blue' : 'indigo'}`}>
                    {drive.type === 'virtual' ? '🌐 Virtual' : '🏛️ On-Campus'}
                  </span>
                </div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Venue</div>
                <div className="drive-info-value">{drive.venue?.trim() ? drive.venue : '—'}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label">Registered</div>
                <div className="drive-info-value">{drive.registered} students</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="req-drive-title">
            <div className="modal-header">
              <h2 className="modal-title" id="req-drive-title">Request placement drive</h2>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                Submits a drive in <strong>requested</strong> status and sends a notification to each college admin after the drive is saved.
              </p>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. SDE — Phase 2" />
              </div>
              <div className="form-group">
                <label className="form-label">Drive type</label>
                <select className="form-select" value={form.driveType} onChange={(e) => setForm((p) => ({ ...p, driveType: e.target.value }))}>
                  <option value="on_campus">On campus</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="off_campus">Off campus</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred date</label>
                <input className="form-input" type="date" value={form.driveDate} onChange={(e) => setForm((p) => ({ ...p, driveDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input
                  className="form-input"
                  value={form.venue}
                  onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                  placeholder="Venue (optional — add when known)"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes for placement office</label>
                <textarea className="form-textarea" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={submitDrive} disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
