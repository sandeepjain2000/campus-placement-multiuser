'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { rowsToCsv, downloadCsv } from '@/lib/csvExport';

const PREPARE_MS = 600;

/**
 * @typedef {{ headers: string[]; rows: string[][] }} CsvPayload
 */

/**
 * Dual mode: split control — primary exports current view; chevron opens menu (current + full).
 * Multi mode: single trigger + menu of named exports (e.g. reports tables).
 *
 * @param {object} props
 * @param {'dual'|'multi'} [props.mode]
 * @param {string} [props.filenameBase] — dual mode stem
 * @param {number} [props.currentCount]
 * @param {number} [props.fullCount]
 * @param {(scope: 'current'|'full') => CsvPayload} [props.getRows]
 * @param {Array<{ id: string; label: string; filename: string; rowCount?: number; getRows: () => CsvPayload }>} [props.exportMenus]
 * @param {string} [props.className]
 * @param {'sm'|'md'} [props.size]
 */
export function ExportCsvSplitButton({
  mode = 'dual',
  filenameBase = 'export',
  currentCount = 0,
  fullCount = 0,
  getRows,
  exportMenus,
  className = '',
  size = 'md',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const wrapRef = useRef(null);
  const chevronRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
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

  const runExport = useCallback(async (build, fileStem) => {
    setPreparing(true);
    setMenuOpen(false);
    await new Promise((r) => setTimeout(r, PREPARE_MS));
    try {
      const { headers, rows } = build();
      const csv = rowsToCsv(headers, rows);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`${fileStem}_${stamp}`, csv);
    } finally {
      setPreparing(false);
    }
  }, []);

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  if (mode === 'multi' && exportMenus?.length) {
    return (
      <div className={`export-csv-wrap export-csv-multi ${className}`} ref={wrapRef}>
        <button
          type="button"
          className={`btn export-csv-trigger ${sizeClass}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={preparing}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {preparing ? (
            <span className="export-csv-preparing">Preparing…</span>
          ) : (
            <>
              <span className="export-csv-icon" aria-hidden>⬇</span>
              Export CSV
              <span className="export-csv-chevron" aria-hidden>▾</span>
            </>
          )}
        </button>
        {menuOpen && !preparing && (
          <div className="export-csv-menu" role="menu">
            <p className="export-csv-hint" role="note">
              Choose a table. Large exports may be emailed in production.
            </p>
            {exportMenus.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="export-csv-menu-item"
                onClick={() =>
                  runExport(item.getRows, item.filename)
                }
              >
                <span className="export-csv-menu-label">{item.label}</span>
                {item.rowCount != null && (
                  <span className="export-csv-menu-meta font-mono">
                    {item.rowCount} rows
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const sameDataset = fullCount === currentCount;
  const dualDisabled = preparing || !getRows;

  const primaryExport = () => {
    if (sameDataset) {
      runExport(() => getRows('full'), `${filenameBase}_full`);
    } else {
      runExport(() => getRows('current'), `${filenameBase}_filtered`);
    }
  };

  return (
    <div
      className={`export-csv-wrap export-csv-split ${className}`}
      ref={wrapRef}
    >
      <div
        className={`export-csv-split-inner${sameDataset ? ' export-csv-split-inner--single' : ''}`}
      >
        <button
          type="button"
          className={`btn export-csv-primary ${sizeClass}`}
          disabled={dualDisabled}
          onClick={primaryExport}
          title="Export using active filters"
        >
          {preparing ? (
            <span className="export-csv-preparing">Preparing…</span>
          ) : (
            <>
              <span className="export-csv-icon" aria-hidden>⬇</span>
              Export CSV
            </>
          )}
        </button>
        {!sameDataset && (
          <button
            type="button"
            ref={chevronRef}
            className={`btn export-csv-chevron-btn ${sizeClass}`}
            disabled={preparing}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More export options"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span aria-hidden>▾</span>
          </button>
        )}
      </div>
      {menuOpen && !preparing && !sameDataset && (
        <div className="export-csv-menu export-csv-menu-split" role="menu">
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() =>
              runExport(() => getRows('current'), `${filenameBase}_filtered`)
            }
          >
            <span className="export-csv-menu-label">Current view</span>
            <span className="export-csv-menu-meta font-mono">
              {currentCount} rows
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="export-csv-menu-item"
            onClick={() =>
              runExport(() => getRows('full'), `${filenameBase}_full`)
            }
          >
            <span className="export-csv-menu-label">Full dataset</span>
            <span className="export-csv-menu-meta font-mono">
              {fullCount} rows
            </span>
          </button>
          <p className="export-csv-footnote" role="note">
            Very large exports may be emailed in production.
          </p>
        </div>
      )}
    </div>
  );
}
