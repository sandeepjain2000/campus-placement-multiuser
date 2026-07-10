'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Matches ExportCsvSplitButton layout: primary action + chevron menu.
 *
 * @param {object} props
 * @param {(file: File) => void | Promise<void>} props.onFileSelected
 * @param {() => void} props.onDownloadTemplate
 * @param {boolean} [props.busy]
 * @param {string} [props.accept]
 * @param {string} [props.className]
 * @param {'sm'|'md'} [props.size]
 */
export function ImportCsvSplitButton({
  onFileSelected,
  onDownloadTemplate,
  busy = false,
  accept = '.csv,text/csv',
  className = '',
  size = 'md',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);
  const chevronRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        chevronRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const openPicker = useCallback(() => {
    setMenuOpen(false);
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      await onFileSelected(file);
    },
    [onFileSelected],
  );

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <div className={`export-csv-wrap export-csv-split import-csv-split ${className}`} ref={wrapRef}>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onChange} aria-hidden />
      <div className="export-csv-split-inner">
        <button
          type="button"
          className={`btn export-csv-primary ${sizeClass}`}
          disabled={busy}
          onClick={openPicker}
        >
          {busy ? (
            <span className="export-csv-preparing">Importing…</span>
          ) : (
            <>
              <span className="export-csv-icon" aria-hidden>⬆</span>
              Import CSV
            </>
          )}
        </button>
        <button
          type="button"
          ref={chevronRef}
          className={`btn export-csv-chevron-btn ${sizeClass}`}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="More import options"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden>▾</span>
        </button>
      </div>
      {menuOpen && !busy && (
        <div className="export-csv-menu export-csv-menu-split" role="menu">
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() => {
              setMenuOpen(false);
              onDownloadTemplate?.();
            }}
          >
            <span className="export-csv-menu-label">Download template</span>
            <span className="export-csv-menu-meta">Same columns as export</span>
          </button>
          <p className="export-csv-footnote" role="note">
            Use the same header row and column order as exported files. Extra columns are ignored; missing required columns will fail validation.
          </p>
        </div>
      )}
    </div>
  );
}
