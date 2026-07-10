'use client';

/**
 * LMS-style in-content page header (title + subtitle + actions).
 */
export default function AppPageHeader({ title, description, actions, children }) {
  return (
    <header className="app-page-header">
      <div className="app-page-header__main">
        <h1 className="app-page-header__title">{title}</h1>
        {description ? <p className="app-page-header__description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="app-page-header__actions">{actions}</div> : null}
    </header>
  );
}
