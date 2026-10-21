/**
 * PlacementHub icon only (the rounded P mark). The word “PlacementHub”
 * stays as text beside this so the lockup is not pasted into every slot.
 */
export default function BrandMark({ size = 32, className = '' }) {
  const px = typeof size === 'number' ? size : 32;
  return (
    <img
      src="/brand/placementhub-mark.png"
      alt=""
      width={px}
      height={px}
      draggable={false}
      className={className}
      style={{ width: px, height: px, display: 'block', flexShrink: 0, objectFit: 'contain' }}
    />
  );
}
