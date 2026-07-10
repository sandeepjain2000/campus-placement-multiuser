'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ProfilePhotoLightbox({ src, alt = 'Profile photo', onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="modal-overlay profile-photo-lightbox-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="profile-photo-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Profile photo preview"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="profile-photo-lightbox-close"
          onClick={onClose}
          aria-label="Close photo preview"
        >
          <X size={20} aria-hidden />
        </button>
        <img src={src} alt={alt} className="profile-photo-lightbox-img" />
      </div>
    </div>
  );
}
