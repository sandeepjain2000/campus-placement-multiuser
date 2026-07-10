'use client';

import { useEffect, useState } from 'react';
import { resolveStudentPhotoDisplayUrl } from '@/lib/clientAssetUrl';

/**
 * Student row avatar: S3 photos via /api/s3/view, initials fallback on missing/broken URLs.
 */
export default function StudentListAvatar({
  photo,
  name = '',
  size = 34,
  className = '',
  style = {},
}) {
  const initials = String(name)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const src = resolveStudentPhotoDisplayUrl(photo);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const boxStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    ...style,
  };

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{
          ...boxStyle,
          background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
          color: 'var(--primary-700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size <= 34 ? '0.75rem' : '0.85rem',
          fontWeight: 700,
          border: '1px solid var(--primary-300)',
        }}
        aria-hidden
      >
        {initials || 'S'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
      style={{
        ...boxStyle,
        objectFit: 'cover',
        border: '1px solid var(--border-default)',
      }}
    />
  );
}
