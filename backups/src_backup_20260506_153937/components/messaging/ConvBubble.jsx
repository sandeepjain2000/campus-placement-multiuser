'use client';

/**
 * Chat-style bubble: `side` "left" = other party, "right" = viewer / own org.
 */
export function ConvBubble({ side, label, meta, children }) {
  const isRight = side === 'right';
  return (
    <div className={`conv-row ${isRight ? 'conv-row--end' : 'conv-row--start'}`}>
      <div className={`conv-bubble ${isRight ? 'conv-bubble--self' : 'conv-bubble--peer'}`}>
        {label ? <div className="conv-bubble-label">{label}</div> : null}
        {meta ? <div className="conv-bubble-meta">{meta}</div> : null}
        <div className="conv-bubble-body">{children}</div>
      </div>
    </div>
  );
}

export function ConvThread({ children }) {
  return <div className="conv-thread">{children}</div>;
}
