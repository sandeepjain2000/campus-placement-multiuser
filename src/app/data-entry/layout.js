'use client';

import DevScreenTag from '@/components/DevScreenTag';

export default function DataEntryLayout({ children }) {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 2000,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <DevScreenTag />
        </div>
      </div>
      {children}
    </>
  );
}
