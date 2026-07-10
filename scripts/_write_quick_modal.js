const fs = require('fs');
const p = 'src/app/dashboard/college/students/StudentQuickViewModal.jsx';
const content = `'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { formatStatus, getStatusColor } from '@/lib/utils';

function Field({ label, value, children }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
      <motion.div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </motion.div>
      {children || (
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{value || '—'}</motion.div>
      )}
    </motion.div>
  );
}
`;
fs.writeFileSync(p, content.replace(/motion\.div/g, 'div'));
