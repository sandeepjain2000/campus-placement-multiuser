'use client';

import { X, UserPlus } from 'lucide-react';
import AddStudentForm from '@/components/college/AddStudentForm';

export default function AddStudentDrawer({ open, onClose, onSuccess }) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 300, backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 540,
        background: 'var(--bg-elevated)',
        zIndex: 301, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease-out',
      }}
      >
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.5rem', background: 'var(--primary-50)', borderRadius: '8px',
              display: 'flex', color: 'var(--primary-600)',
            }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Student</h2>
              <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                A welcome email will be sent with login credentials.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
              borderRadius: '8px', width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        <AddStudentForm
          active={open}
          onSuccess={(json) => { onSuccess(json); onClose(); }}
          onCancel={onClose}
          bodyPadding="1.5rem"
        />
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}
      </style>
    </>
  );
}
