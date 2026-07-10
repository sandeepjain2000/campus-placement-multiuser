'use client';
import { useState } from 'react';
import { getInitials } from '@/lib/utils';

/**
 * Entity logo: uses explicit logoUrl when provided (uploaded / saved URL).
 * Otherwise shows initials — no third-party logo guessing.
 */
export default function EntityLogo({
  name = '',
  logoUrl = null,
  website: _website = null,
  size = 'md',
  shape = 'rounded',
  className = '',
}) {
  const candidates = [logoUrl].filter(Boolean);

  const [idx, setIdx] = useState(0);

  const handleError = () => {
    if (idx + 1 < candidates.length) {
      setIdx(idx + 1);
    }
  };

  const sizeMap = {
    xs: { boxSize: 20, borderRadius: shape === 'circle' ? '50%' : '4px' },
    sm: { boxSize: 32, borderRadius: shape === 'circle' ? '50%' : '6px' },
    md: { boxSize: 40, borderRadius: shape === 'circle' ? '50%' : '8px' },
    lg: { boxSize: 56, borderRadius: shape === 'circle' ? '50%' : '10px' },
    xl: { boxSize: 80, borderRadius: shape === 'circle' ? '50%' : '14px' },
  };
  const { boxSize, borderRadius } = sizeMap[size] || sizeMap.md;

  if (!candidates.length || idx >= candidates.length) {
    return (
      <div
        className={`entity-logo ${className}`}
        style={{
          width: boxSize,
          height: boxSize,
          minWidth: boxSize,
          background: 'var(--bg-tertiary, #f1f5f9)',
          color: 'var(--text-secondary, #64748b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: Math.max(10, boxSize * 0.32),
          borderRadius,
          border: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`entity-logo ${className}`}
      style={{
        width: boxSize,
        height: boxSize,
        minWidth: boxSize,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        border: '1px solid var(--border-default)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      title={name}
    >
      <img
        src={candidates[idx]}
        alt={name}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: size === 'xs' ? 2 : 4,
          display: 'block',
        }}
      />
    </div>
  );
}
