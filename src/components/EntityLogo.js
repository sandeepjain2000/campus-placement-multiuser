'use client';
import { useEffect, useMemo, useState } from 'react';
import { getInitials } from '@/lib/utils';
import { toSignedViewUrl } from '@/lib/clientAssetUrl';

/**
 * Entity logo: uses explicit logoUrl when provided (uploaded / saved URL).
 * Optional placeholderUrl (e.g. default circle) is tried before initials.
 */
export default function EntityLogo({
  name = '',
  logoUrl = null,
  website: _website = null,
  size = 'md',
  shape = 'rounded',
  className = '',
  placeholderUrl = null,
}) {
  const candidates = useMemo(() => {
    const urls = [logoUrl, placeholderUrl]
      .filter(Boolean)
      .map((u) => toSignedViewUrl(u))
      .filter(Boolean);
    return [...new Set(urls)];
  }, [logoUrl, placeholderUrl]);

  const [idx, setIdx] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setImageFailed(false);
  }, [logoUrl, candidates.join('|')]);

  const handleError = () => {
    if (idx + 1 < candidates.length) {
      setIdx((i) => i + 1);
      return;
    }
    setImageFailed(true);
  };

  const sizeMap = {
    xs: { boxSize: 20, borderRadius: shape === 'circle' ? '50%' : '4px' },
    sm: { boxSize: 32, borderRadius: shape === 'circle' ? '50%' : '6px' },
    md: { boxSize: 40, borderRadius: shape === 'circle' ? '50%' : '8px' },
    lg: { boxSize: 56, borderRadius: shape === 'circle' ? '50%' : '10px' },
    xl: { boxSize: 80, borderRadius: shape === 'circle' ? '50%' : '14px' },
  };
  const { boxSize, borderRadius } = sizeMap[size] || sizeMap.md;

  const showInitials = !candidates.length || idx >= candidates.length || imageFailed;

  if (showInitials) {
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
        background: 'var(--bg-primary)',
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
        alt=""
        aria-hidden="true"
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
