'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export default function ProfilePhotoLightbox({ src, alt = 'Profile photo', onClose }) {
  if (!src) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Profile photo preview</DialogTitle>
        <img src={src} alt={alt} className="max-h-[85vh] w-full rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}
