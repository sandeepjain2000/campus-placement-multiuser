'use client';

import { useEffect, useMemo, useState } from 'react';
import { getInitials } from '@/lib/utils';
import { resolveStudentPhotoDisplayUrl } from '@/lib/clientAssetUrl';

/** Bust browser cache after a fresh upload (proxy or static paths). */
export function withAvatarCacheBust(displayUrl, token) {
  const src = String(displayUrl || '').trim();
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  const bust = token != null ? String(token) : String(Date.now());
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}v=${encodeURIComponent(bust)}`;
}

/**
 * Profile header photo with initials fallback when the image URL fails to load.
 */
export default function StudentProfileAvatar({
  photo,
  name = '',
  previewUrl = '',
  cacheBust = null,
  sizeClassName = 'profile-avatar',
  clickable = false,
  onOpenPreview,
  style = {},
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name) || 'S';

  const resolved = useMemo(() => {
    if (previewUrl) return previewUrl;
    const base = resolveStudentPhotoDisplayUrl(photo) || String(photo || '').trim();
    return base ? withAvatarCacheBust(base, cacheBust) : '';
  }, [photo, previewUrl, cacheBust]);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const boxStyle = {
    overflow: 'hidden',
    padding: 0,
    background: 'var(--bg-tertiary)',
    ...style,
  };

  if (!resolved || failed) {
    return (
      <div className={sizeClassName} style={boxStyle} aria-hidden={!name}>
        {initials}
      </div>
    );
  }

  const img = (
    <img
      src={resolved}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );

  if (clickable && onOpenPreview) {
    return (
      <button
        type="button"
        className={`${sizeClassName} profile-avatar--clickable`}
        style={boxStyle}
        onClick={onOpenPreview}
        aria-label="View profile photo"
        title="View profile photo"
      >
        {img}
      </button>
    );
  }

  return (
    <div className={sizeClassName} style={boxStyle}>
      {img}
    </div>
  );
}
