'use client';

/**
 * White content block on the gray page canvas.
 */
export default function AppContentCard({ title, description, actions, children, className = '', padding = true }) {
  return (
    <section className={`app-content-card ${padding ? 'app-content-card--padded' : ''} ${className}`.trim()}>
      {title || description || actions ? (
        <div className="app-content-card__header">
          <div className="app-content-card__heading">
            {title ? <h2 className="app-content-card__title">{title}</h2> : null}
            {description ? <p className="app-content-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="app-content-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
