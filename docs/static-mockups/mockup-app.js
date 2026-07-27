(function () {
  const MENUS = window.PLACEMENTHUB_MOCKUP_MENUS || {};

  const ROLE_FILES = {
    student: 'student.html',
    college: 'college.html',
    employer: 'employer.html',
    'placement-committee': 'placement-committee.html',
    'super-admin': 'super-admin.html',
  };

  const PROFILES = {
    student: {
      menuKey: 'student',
      userName: 'Alex Kumar',
      hubTitle: 'Alex — Home',
      initials: 'AK',
      roleLabel: 'Student',
      orgTitle: 'Alex Kumar',
      orgSubtitle: 'Student Portal',
      showFullNav: false,
      entityLogo: false,
      academicYear: false,
      employerCampus: false,
      studentEmail: true,
      committeeBanner: false,
      profileHref: '/dashboard/student/profile',
    },
    college: {
      menuKey: 'college_admin',
      userName: 'Priya Sharma',
      hubTitle: 'National Institute of Technology (Demo) Home',
      initials: 'PS',
      roleLabel: 'College Admin',
      orgTitle: 'National Institute of Technology (Demo)',
      orgSubtitle: 'College Administration',
      showFullNav: false,
      entityLogo: true,
      entityInitials: 'NIT',
      academicYear: true,
      academicYearValue: '2025-26',
      employerCampus: false,
      studentEmail: false,
      committeeBanner: false,
      profileHref: '/dashboard/college/settings',
    },
    employer: {
      menuKey: 'employer',
      userName: 'Rahul Mehta',
      hubTitle: 'TechCorp India (Demo) Home',
      initials: 'RM',
      roleLabel: 'Employer',
      orgTitle: 'TechCorp India (Demo)',
      orgSubtitle: 'Corporate Partner',
      showFullNav: false,
      entityLogo: true,
      entityInitials: 'TC',
      academicYear: true,
      academicYearValue: '2025-26',
      employerCampus: true,
      studentEmail: false,
      committeeBanner: false,
      profileHref: '/dashboard/employer/profile',
    },
    'placement-committee': {
      menuKey: 'placement_committee',
      userName: 'Ananya Reddy',
      hubTitle: 'National Institute of Technology (Demo) Home',
      initials: 'AR',
      roleLabel: 'Placement Committee',
      orgTitle: 'National Institute of Technology (Demo)',
      orgSubtitle: 'College Administration',
      showFullNav: false,
      entityLogo: false,
      academicYear: true,
      academicYearValue: '2025-26',
      employerCampus: false,
      studentEmail: false,
      committeeBanner: true,
      profileHref: '/dashboard/college/overview',
    },
    'super-admin': {
      menuKey: 'super_admin',
      userName: 'Platform Admin',
      hubTitle: 'Platform Administration',
      initials: 'PA',
      roleLabel: 'Super Admin',
      orgTitle: 'PlacementHub SuperAdmin',
      orgSubtitle: 'Platform operations',
      showFullNav: true,
      entityLogo: true,
      entityInitials: 'PH',
      academicYear: false,
      employerCampus: false,
      studentEmail: false,
      committeeBanner: false,
      profileHref: '/dashboard/admin/settings',
    },
  };

  const QUICK_ACTIONS = {
    student: [
      { label: 'Browse drives', href: '/dashboard/student/drives' },
      { label: 'My internships', href: '/dashboard/student/applications/internships' },
      { label: 'Mentor Connect', href: '/dashboard/student/mentorship-requests' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'My profile', href: '/dashboard/student/profile' },
    ],
    college: [
      { label: 'Students', href: '/dashboard/college/students' },
      { label: 'Placement drives', href: '/dashboard/college/drives' },
      { label: 'Employers', href: '/dashboard/college/employers' },
      { label: 'Employer Partnership Requests', href: '/dashboard/college/employers/requests' },
      { label: 'Marketplace', href: '/dashboard/college/marketplace' },
      { label: 'Settings', href: '/dashboard/college/settings' },
      { label: 'Alerts', href: '/dashboard/alerts' },
    ],
    employer: [
      { label: 'Campus Partnerships', href: '/dashboard/employer/select-campus' },
      { label: 'Alumni job postings', href: '/dashboard/employer/alumni/jobs' },
      { label: 'Placement drives', href: '/dashboard/employer/drives' },
      { label: 'Applications', href: '/dashboard/employer/applications' },
      { label: 'Marketplace', href: '/dashboard/employer/marketplace' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'Feedback', href: '/dashboard/feedback' },
    ],
    'placement-committee': [
      { label: 'Students', href: '/dashboard/college/students' },
      { label: 'Applications', href: '/dashboard/college/applications' },
      { label: 'Alerts', href: '/dashboard/alerts' },
      { label: 'Feedback', href: '/dashboard/feedback' },
    ],
    'super-admin': [
      { label: 'Onboard colleges & employers', href: '/dashboard/admin/pending-registrations' },
      { label: 'Colleges', href: '/dashboard/admin/colleges' },
      { label: 'Marketplace', href: '/dashboard/admin/marketplace' },
      { label: 'Users', href: '/dashboard/admin/users' },
      { label: 'Employers', href: '/dashboard/admin/employers' },
      { label: 'Feedback inbox', href: '/dashboard/admin/feedback' },
      { label: 'Platform overview', href: '/dashboard/admin/overview' },
    ],
  };

  function hrefToSlug(href) {
    if (!href || href.startsWith('#')) {
      return (href || 'placeholder').replace(/^#/, 'hash-').replace(/[^a-zA-Z0-9-]/g, '-');
    }
    return href
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  window.PLACEMENTHUB_MOCKUP_hrefToSlug = hrefToSlug;

  function isSubpage() {
    return Boolean(document.body.dataset.mockupHref);
  }

  function assetPrefix() {
    return isSubpage() ? '../../' : '';
  }

  function pageLink(profileKey, href) {
    if (!href || href.startsWith('#')) return '#';
    const slug = hrefToSlug(href);
    if (isSubpage()) return `${slug}.html`;
    return `pages/${profileKey}/${slug}.html`;
  }

  function homeLink(profileKey) {
    const file = ROLE_FILES[profileKey];
    return isSubpage() ? `../../${file}` : file;
  }

  function iconEl(name, size) {
    const s = size || 18;
    return `<i data-lucide="${name}" aria-hidden="true" style="width:${s}px;height:${s}px"></i>`;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function findSectionIdForHref(menu, pathname) {
    let bestLen = -1;
    let bestId = menu.sections[0]?.id ?? null;
    for (const section of menu.sections) {
      for (const item of section.items) {
        const h = item.href;
        if (pathname === h || (h.startsWith('/') && pathname.startsWith(`${h}/`))) {
          if (h.length > bestLen) {
            bestLen = h.length;
            bestId = section.id;
          }
        }
      }
    }
    return bestId;
  }

  function findItemByHref(menu, href) {
    for (const section of menu.sections) {
      for (const item of section.items) {
        if (item.href === href) return { section, item };
      }
    }
    return null;
  }

  function isItemActive(itemHref, section, menu, currentHref) {
    let best = null;
    let bestLen = -1;
    for (const sec of menu.sections) {
      for (const item of sec.items) {
        const h = item.href;
        if (currentHref === h || (h.startsWith('/') && currentHref.startsWith(`${h}/`))) {
          if (h.length > bestLen) {
            bestLen = h.length;
            best = h;
          }
        }
      }
    }
    return best === itemHref;
  }

  function isItemActiveInMenu(itemHref, menu, currentHref) {
    return isItemActive(itemHref, null, menu, currentHref);
  }

  function entityLogoHtml(profile, sizeClass) {
    if (!profile.entityLogo) return '';
    const cls = sizeClass ? ` ${sizeClass}` : '';
    return `<div class="mockup-entity-logo mockup-entity-logo--placeholder${cls}" aria-hidden="true">${esc(profile.entityInitials || 'PH')}</div>`;
  }

  function statusBadge(cell) {
    if (!cell || typeof cell !== 'object' || !cell.__status) return esc(cell);
    const kind = cell.kind || 'neutral';
    return `<span class="mockup-status mockup-status--${esc(kind)}"><span class="mockup-status-dot" aria-hidden="true"></span>${esc(cell.label)}</span>`;
  }

  /**
   * @param {{ label: string, href?: string|null }[]} crumbs
   */
  function renderBreadcrumbs(crumbs) {
    if (!crumbs?.length) return '';
    const parts = crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      const sep =
        i === 0
          ? ''
          : `<span class="separator" aria-hidden="true">${iconEl('chevron-right', 12)}</span>`;
      if (isLast || !c.href) {
        return `${sep}<span class="mockup-breadcrumb-current" aria-current="page">${esc(c.label)}</span>`;
      }
      return `${sep}<a href="${esc(c.href)}">${esc(c.label)}</a>`;
    });
    return `<nav class="topbar-breadcrumb mockup-page-breadcrumb" aria-label="Breadcrumb">${parts.join('')}</nav>`;
  }

  function buildPageBreadcrumbs({
    profileKey,
    menu,
    sectionId,
    pageTitle,
    currentHref,
    nestTrail,
  }) {
    const section = menu.sections.find((s) => s.id === sectionId) || menu.sections[0];
    const sectionFirst = section?.items?.find((i) => !i.disabled && !String(i.href).startsWith('#'));
    const crumbs = [
      { label: 'Home', href: homeLink(profileKey) },
    ];
    if (section) {
      crumbs.push({
        label: section.title.replace(/^💬\s*/, ''),
        href: sectionFirst ? pageLink(profileKey, sectionFirst.href) : null,
      });
    }
    // List-level page (linked when drilled into a nested detail)
    crumbs.push({
      label: pageTitle,
      href: nestTrail?.length ? pageLink(profileKey, currentHref) : null,
    });
    if (nestTrail?.length) {
      for (const n of nestTrail) {
        crumbs.push({ label: n.label, href: n.href || null });
      }
    }
    return crumbs;
  }

  function renderMockTable(href, pageTitle, profileKey) {
    const tables = window.PLACEMENTHUB_MOCKUP_TABLES || {};
    const resolve = window.PLACEMENTHUB_MOCKUP_resolveTable;
    const key = typeof resolve === 'function' ? resolve(href) : 'generic';
    const table = tables[key] || tables.generic;
    if (!table) {
      return `<div class="card mockup-empty-panel">No sample table for this screen.</div>`;
    }

    const rowActions =
      typeof window.PLACEMENTHUB_MOCKUP_resolveRowActions === 'function'
        ? window.PLACEMENTHUB_MOCKUP_resolveRowActions(key)
        : [];
    const bulkActions =
      typeof window.PLACEMENTHUB_MOCKUP_resolveBulkActions === 'function'
        ? window.PLACEMENTHUB_MOCKUP_resolveBulkActions(key)
        : [];

    const actionBtn = (a, rowIndex) => {
      const variantClass =
        a.variant === 'danger'
          ? 'btn-danger'
          : a.variant === 'primary'
            ? 'btn-primary'
            : a.variant === 'success'
              ? 'btn-success'
              : a.variant === 'ghost'
                ? 'btn-ghost'
                : 'btn-secondary';
      if (a.menu && a.menu.length) {
        return `<div class="mockup-action-menu" data-row="${rowIndex}">
          <button type="button" class="btn ${variantClass} btn-icon btn-sm mockup-action-more" title="${esc(a.label)}" aria-label="${esc(a.label)}" aria-haspopup="true" aria-expanded="false">
            ${iconEl(a.icon, 16)}
          </button>
          <div class="mockup-action-menu-panel" hidden role="menu">
            ${a.menu
              .map(
                (label) =>
                  `<button type="button" class="mockup-action-menu-item" role="menuitem">${esc(label)}</button>`,
              )
              .join('')}
          </div>
        </div>`;
      }
      return `<button type="button" class="btn ${variantClass} btn-icon btn-sm" title="${esc(a.label)}" aria-label="${esc(a.label)}" data-mockup-action="${esc(a.action)}" data-row="${rowIndex}">${iconEl(a.icon, 16)}</button>`;
    };

    const sortGlyph = `<span class="mockup-sort-glyphs" aria-hidden="true"><span class="mockup-sort-up"></span><span class="mockup-sort-down"></span></span>`;

    const thead = `
      <th class="mockup-col-select" scope="col">
        <input type="checkbox" class="mockup-row-check mockup-select-all" aria-label="Select all rows" />
      </th>
      ${table.columns
        .map(
          (c, colIndex) => `<th class="mockup-th-sortable" scope="col" data-sort-col="${colIndex}" aria-sort="none">
          <button type="button" class="mockup-th-sort-btn" data-sort-col="${colIndex}" title="Sort by ${esc(c)}">
            <span class="mockup-th-label">${esc(c)}</span>
            ${sortGlyph}
          </button>
        </th>`,
        )
        .join('')}
      <th class="mockup-col-actions" scope="col">Actions</th>`;

    /** Expand sample rows so pagination controls are meaningful. */
    function expandRows(rows, target = 28) {
      if (!rows.length) return [];
      const out = [];
      let n = 0;
      while (out.length < target) {
        const base = rows[n % rows.length];
        const copy = base.map((cell) => {
          if (cell && typeof cell === 'object' && cell.__status) {
            return { __status: true, label: cell.label, kind: cell.kind };
          }
          return cell;
        });
        // Differentiate repeated names slightly for demo sorting/pagination
        if (typeof copy[0] === 'string' && n >= rows.length) {
          copy[0] = `${copy[0]} (${Math.floor(n / rows.length) + 1})`;
        }
        out.push(copy);
        n += 1;
      }
      return out;
    }

    const displayRows = expandRows(table.rows, 28);
    const details = Array.isArray(table.details) ? table.details : [];
    if (details.length) {
      try {
        sessionStorage.setItem(`ph_mockup_details_${key}`, JSON.stringify(details));
      } catch (_) {}
    }

    function renderBody(rows) {
      return rows
        .map((row, rowIndex) => {
          const detailIndex = details.length ? rowIndex % details.length : -1;
          const cells = row
            .map((cell) => {
              if (cell && typeof cell === 'object' && cell.__status) {
                return `<td>${statusBadge(cell)}</td>`;
              }
              return `<td>${esc(cell)}</td>`;
            })
            .join('');
          return `<tr data-row-index="${rowIndex}" data-detail-index="${detailIndex}">
          <td class="mockup-col-select">
            <input type="checkbox" class="mockup-row-check mockup-row-check--item" aria-label="Select row ${rowIndex + 1}" />
          </td>
          ${cells}
          <td class="mockup-col-actions">
            <div class="mockup-row-actions">${rowActions.map((a) => actionBtn(a, rowIndex)).join('')}</div>
          </td>
        </tr>`;
        })
        .join('');
    }

    const tbody = renderBody(displayRows);

    const bulkBtns = bulkActions
      .map((b) => {
        const variantClass =
          b.variant === 'danger'
            ? 'btn-danger'
            : b.variant === 'primary'
              ? 'btn-primary'
              : b.variant === 'success'
                ? 'btn-success'
                : 'btn-secondary';
        return `<button type="button" class="btn ${variantClass} btn-sm" disabled title="Static mockup — no server action">${iconEl(b.icon, 14)} ${esc(b.label)}</button>`;
      })
      .join('');

    const empty =
      typeof window.PLACEMENTHUB_MOCKUP_resolveEmptyState === 'function'
        ? window.PLACEMENTHUB_MOCKUP_resolveEmptyState(key)
        : {
            icon: 'inbox',
            title: 'Nothing here yet',
            description: 'When records are available, they will appear here.',
            cta: 'Get started',
          };

    const filterBar =
      key === 'errorLogs'
        ? `<div class="mockup-filter-bar">
        <label class="mockup-filter-field">
          <span>Date</span>
          <input type="month" class="form-input" value="2026-07" aria-label="Filter by month" />
        </label>
        <label class="mockup-filter-field">
          <span>Severity</span>
          <select class="form-input" aria-label="Severity">
            <option selected>All severities</option>
            <option>ERROR</option>
            <option>WARN</option>
            <option>INFO</option>
          </select>
        </label>
        <label class="mockup-filter-field">
          <span>Functionality</span>
          <select class="form-input" aria-label="Functionality">
            <option selected>All functionalities</option>
            <option>College — student CV list</option>
            <option>Notifications</option>
            <option>Employer — applications</option>
            <option>Student — profile</option>
          </select>
        </label>
      </div>`
        : '';

    return `
      <div class="table-toolbar" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <div class="table-search" style="position:relative;min-width:min(240px,100%)">
          <input type="search" class="form-input" placeholder="Search ${esc(pageTitle)}…" disabled style="width:100%;padding-left:0.75rem" />
        </div>
        <div class="table-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" id="mockup-toggle-empty" title="Preview zero-data layout">${iconEl('inbox', 14)} Empty state</button>
          <span class="btn btn-secondary btn-sm" style="opacity:0.75;pointer-events:none">Filter</span>
          <span class="btn btn-primary btn-sm" style="opacity:0.75;pointer-events:none">Export</span>
        </div>
      </div>
      ${filterBar}
      <div class="mockup-bulk-bar" id="mockup-bulk-bar" hidden>
        <span class="mockup-bulk-bar-count"><strong data-bulk-count>0</strong> selected</span>
        <div class="mockup-bulk-bar-actions">${bulkBtns}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="mockup-bulk-clear">Clear</button>
      </div>
      <div class="mockup-table-view" id="mockup-table-view">
        <div class="card card-table-shell">
          <div class="table-container">
            <table class="data-table mockup-data-table" data-table-key="${esc(key)}">
              <thead><tr>${thead}</tr></thead>
              <tbody>${tbody}</tbody>
            </table>
          </div>
        </div>
        <div class="mockup-pagination" id="mockup-pagination" role="navigation" aria-label="Table pagination">
          <div class="mockup-pagination-left">
            <label class="mockup-page-size">
              <span>Rows per page</span>
              <select class="form-input mockup-page-size-select" id="mockup-page-size" aria-label="Rows per page">
                <option value="5">5</option>
                <option value="10" selected>10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
            <span class="mockup-pagination-range" id="mockup-pagination-range">Showing 1–10 of ${displayRows.length}</span>
          </div>
          <div class="mockup-pagination-controls">
            <button type="button" class="btn btn-secondary btn-icon btn-sm" id="mockup-page-first" title="First page" aria-label="First page">${iconEl('chevrons-left', 16)}</button>
            <button type="button" class="btn btn-secondary btn-icon btn-sm" id="mockup-page-prev" title="Previous page" aria-label="Previous page">${iconEl('chevron-left', 16)}</button>
            <span class="mockup-pagination-page" id="mockup-pagination-page">Page 1 of 1</span>
            <button type="button" class="btn btn-secondary btn-icon btn-sm" id="mockup-page-next" title="Next page" aria-label="Next page">${iconEl('chevron-right', 16)}</button>
            <button type="button" class="btn btn-secondary btn-icon btn-sm" id="mockup-page-last" title="Last page" aria-label="Last page">${iconEl('chevrons-right', 16)}</button>
          </div>
        </div>
      </div>
      <div class="card mockup-zero-state" id="mockup-zero-state" hidden>
        <div class="empty-state">
          <div class="empty-state-icon">${iconEl(empty.icon, 36)}</div>
          <div class="empty-state-title">${esc(empty.title)}</div>
          <p class="empty-state-description">${esc(empty.description)}</p>
          <button type="button" class="btn btn-primary" disabled title="Static mockup">${esc(empty.cta)}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="mockup-empty-back" style="margin-top:0.75rem">Show sample data</button>
        </div>
      </div>
      <div class="mockup-drawer-backdrop" id="mockup-drawer-backdrop" hidden></div>
      <aside class="mockup-drawer" id="mockup-drawer" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="mockup-drawer-title">
        <div class="mockup-drawer-header">
          <div>
            <h2 id="mockup-drawer-title" class="mockup-drawer-title">Details</h2>
            <p class="mockup-drawer-sub">Read-only details</p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="mockup-drawer-close" aria-label="Close details">${iconEl('x', 18)}</button>
        </div>
        <div class="mockup-drawer-body" id="mockup-drawer-body"></div>
        <div class="mockup-drawer-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="mockup-drawer-copy">${iconEl('copy', 14)} Copy full log</button>
        </div>
      </aside>
      <p class="mockup-role-switcher">Other roles: ${roleSwitcherLinks(profileKey)} · <a href="${esc(homeLink(profileKey))}">Menu home</a></p>
    `;
  }

  function bindMockTableInteractions(root, options = {}) {
    const table = root.querySelector('.mockup-data-table');
    const tableView = root.querySelector('#mockup-table-view');
    const zeroState = root.querySelector('#mockup-zero-state');
    if (!table && !zeroState) return;

    if (root._mockupTableAbort) {
      root._mockupTableAbort.abort();
    }
    const ac = new AbortController();
    root._mockupTableAbort = ac;
    const { signal } = ac;

    if (!table) return;

    const tbody = table.querySelector('tbody');
    const allRows = tbody ? [...tbody.querySelectorAll('tr')] : [];
    let orderedRows = allRows.slice();
    let page = 1;
    let pageSize = 10;

    const selectAll = table.querySelector('.mockup-select-all');
    const rowChecks = () =>
      [...table.querySelectorAll('tbody .mockup-row-check--item')];
    const bulkBar = root.querySelector('#mockup-bulk-bar');
    const countEl = bulkBar?.querySelector('[data-bulk-count]');
    const bulkButtons = bulkBar ? [...bulkBar.querySelectorAll('.mockup-bulk-bar-actions .btn')] : [];
    const rangeEl = root.querySelector('#mockup-pagination-range');
    const pageEl = root.querySelector('#mockup-pagination-page');
    const btnFirst = root.querySelector('#mockup-page-first');
    const btnPrev = root.querySelector('#mockup-page-prev');
    const btnNext = root.querySelector('#mockup-page-next');
    const btnLast = root.querySelector('#mockup-page-last');
    const pageSizeSelect = root.querySelector('#mockup-page-size');

    function totalPages() {
      return Math.max(1, Math.ceil(orderedRows.length / pageSize));
    }

    function syncBulk() {
      const checks = rowChecks();
      const selected = checks.filter((c) => c.checked).length;
      if (selectAll) {
        selectAll.checked = selected > 0 && selected === checks.length;
        selectAll.indeterminate = selected > 0 && selected < checks.length;
      }
      if (bulkBar) {
        bulkBar.hidden = selected === 0;
        if (countEl) countEl.textContent = String(selected);
        bulkButtons.forEach((btn) => {
          btn.disabled = selected === 0;
        });
      }
      checks.forEach((c) => {
        c.closest('tr')?.classList.toggle('mockup-row-selected', c.checked);
      });
    }

    function renderPage() {
      if (!tbody) return;
      const pages = totalPages();
      if (page > pages) page = pages;
      if (page < 1) page = 1;
      const start = (page - 1) * pageSize;
      const slice = orderedRows.slice(start, start + pageSize);
      tbody.innerHTML = '';
      slice.forEach((tr) => tbody.appendChild(tr));

      const from = orderedRows.length ? start + 1 : 0;
      const to = Math.min(start + pageSize, orderedRows.length);
      if (rangeEl) {
        rangeEl.textContent = `Showing ${from}–${to} of ${orderedRows.length}`;
      }
      if (pageEl) {
        pageEl.textContent = `Page ${page} of ${pages}`;
      }

      const atStart = page <= 1;
      const atEnd = page >= pages;
      [btnFirst, btnPrev].forEach((b) => {
        if (b) b.disabled = atStart;
      });
      [btnNext, btnLast].forEach((b) => {
        if (b) b.disabled = atEnd;
      });

      syncIcons();
      syncBulk();
    }

    function setEmpty(show) {
      if (tableView) tableView.hidden = show;
      if (bulkBar && show) bulkBar.hidden = true;
      if (zeroState) zeroState.hidden = !show;
      const toggle = root.querySelector('#mockup-toggle-empty');
      if (toggle) {
        toggle.classList.toggle('btn-secondary', show);
        toggle.classList.toggle('btn-ghost', !show);
      }
      syncIcons();
    }

    selectAll?.addEventListener(
      'change',
      () => {
        rowChecks().forEach((c) => {
          c.checked = selectAll.checked;
        });
        syncBulk();
      },
      { signal },
    );

    table.addEventListener(
      'change',
      (e) => {
        if (e.target.classList.contains('mockup-row-check--item')) syncBulk();
      },
      { signal },
    );

    root.querySelector('#mockup-bulk-clear')?.addEventListener(
      'click',
      () => {
        if (selectAll) selectAll.checked = false;
        rowChecks().forEach((c) => {
          c.checked = false;
        });
        syncBulk();
      },
      { signal },
    );

    pageSizeSelect?.addEventListener(
      'change',
      () => {
        pageSize = Number(pageSizeSelect.value) || 10;
        page = 1;
        renderPage();
      },
      { signal },
    );

    btnFirst?.addEventListener('click', () => {
      page = 1;
      renderPage();
    }, { signal });
    btnPrev?.addEventListener('click', () => {
      page -= 1;
      renderPage();
    }, { signal });
    btnNext?.addEventListener('click', () => {
      page += 1;
      renderPage();
    }, { signal });
    btnLast?.addEventListener('click', () => {
      page = totalPages();
      renderPage();
    }, { signal });

    root.querySelector('#mockup-toggle-empty')?.addEventListener(
      'click',
      () => {
        const showingEmpty = zeroState && !zeroState.hidden;
        setEmpty(!showingEmpty);
      },
      { signal },
    );
    root.querySelector('#mockup-empty-back')?.addEventListener(
      'click',
      () => setEmpty(false),
      { signal },
    );

    root.querySelectorAll('.mockup-action-more').forEach((btn) => {
      btn.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          const menu = btn.closest('.mockup-action-menu');
          const panel = menu?.querySelector('.mockup-action-menu-panel');
          const open = panel && !panel.hidden;
          root.querySelectorAll('.mockup-action-menu-panel').forEach((p) => {
            p.hidden = true;
          });
          root.querySelectorAll('.mockup-action-more').forEach((b) => b.setAttribute('aria-expanded', 'false'));
          if (panel && !open) {
            panel.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
          }
        },
        { signal },
      );
    });

    function closeDrawer() {
      const drawer = root.querySelector('#mockup-drawer');
      const backdrop = root.querySelector('#mockup-drawer-backdrop');
      if (drawer) {
        drawer.hidden = true;
        drawer.setAttribute('aria-hidden', 'true');
        drawer.classList.remove('is-open');
      }
      if (backdrop) backdrop.hidden = true;
      document.body.classList.remove('mockup-drawer-open');
    }

    function openErrorLogDrawer(detail) {
      const drawer = root.querySelector('#mockup-drawer');
      const backdrop = root.querySelector('#mockup-drawer-backdrop');
      const body = root.querySelector('#mockup-drawer-body');
      const title = root.querySelector('#mockup-drawer-title');
      if (!drawer || !body || !detail) return;

      const sev = String(detail.severity || 'info').toLowerCase();
      const sevKind = sev === 'error' ? 'danger' : sev === 'warn' || sev === 'warning' ? 'warning' : 'neutral';

      if (title) title.textContent = `Error log — ${detail.shortId || 'details'}`;
      body.innerHTML = `
        <div class="mockup-drawer-section">
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Full ID</span><code class="mockup-drawer-mono">${esc(detail.fullId || '—')}</code></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Timestamp</span><span>${esc(detail.timestamp || '—')}</span></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Severity</span>${statusBadge({ __status: true, label: sev, kind: sevKind })}</div>
        </div>
        <div class="mockup-drawer-section">
          <h3 class="mockup-drawer-section-title">Functionality</h3>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Label</span><span>${esc(detail.functionality || '—')}</span></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Key</span><code class="mockup-drawer-mono">${esc(detail.functionalityKey || '—')}</code></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">HTTP status</span><span>${esc(detail.httpStatus || '—')}</span></div>
        </div>
        <div class="mockup-drawer-section">
          <h3 class="mockup-drawer-section-title">User &amp; tenant</h3>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">User</span><span>${esc(detail.user || '—')}</span></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Email</span><span>${esc(detail.email || '—')}</span></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Campus</span><span>${esc(detail.campus || '—')}</span></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">IP address</span><span>${esc(detail.ip || '—')}</span></div>
        </div>
        <div class="mockup-drawer-section">
          <h3 class="mockup-drawer-section-title">Request</h3>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Route</span><code class="mockup-drawer-mono">${esc(detail.route || '—')}</code></div>
          <div class="mockup-drawer-field"><span class="mockup-drawer-label">Source</span><code class="mockup-drawer-mono">${esc(detail.source || '—')}</code></div>
        </div>
      `;

      drawer.hidden = false;
      drawer.setAttribute('aria-hidden', 'false');
      drawer.classList.add('is-open');
      if (backdrop) backdrop.hidden = false;
      document.body.classList.add('mockup-drawer-open');
      syncIcons();
    }

    root.querySelector('#mockup-drawer-close')?.addEventListener('click', closeDrawer, { signal });
    root.querySelector('#mockup-drawer-backdrop')?.addEventListener('click', closeDrawer, { signal });
    root.querySelector('#mockup-drawer-copy')?.addEventListener(
      'click',
      () => {
        const text = root.querySelector('#mockup-drawer-body')?.innerText || '';
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      },
      { signal },
    );

    root.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') closeDrawer();
      },
      { signal },
    );

    root.addEventListener(
      'click',
      (e) => {
        const sortBtn = e.target.closest('.mockup-th-sort-btn');
        if (sortBtn) {
          e.preventDefault();
          e.stopPropagation();
          const colIndex = Number(sortBtn.getAttribute('data-sort-col'));
          if (!Number.isFinite(colIndex)) return;

          const ths = [...table.querySelectorAll('th.mockup-th-sortable')];
          const currentTh = ths.find((th) => Number(th.getAttribute('data-sort-col')) === colIndex);
          const prev = currentTh?.getAttribute('aria-sort') || 'none';
          const next = prev === 'none' ? 'ascending' : prev === 'ascending' ? 'descending' : 'none';

          ths.forEach((th) => {
            th.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
            th.setAttribute('aria-sort', 'none');
            const btn = th.querySelector('.mockup-th-sort-btn');
            if (btn) {
              const label = th.querySelector('.mockup-th-label')?.textContent || 'column';
              btn.title = `Sort by ${label}`;
            }
          });

          if (next !== 'none' && currentTh) {
            currentTh.classList.add('sorted', next === 'ascending' ? 'sorted-asc' : 'sorted-desc');
            currentTh.setAttribute('aria-sort', next);
            const btn = currentTh.querySelector('.mockup-th-sort-btn');
            if (btn) {
              const label = currentTh.querySelector('.mockup-th-label')?.textContent || 'column';
              btn.title = `Sorted ${next} by ${label} — click to change`;
            }
          }

          if (next === 'none') {
            orderedRows = allRows.slice();
          } else {
            const tdIndex = colIndex + 1;
            const dir = next === 'ascending' ? 1 : -1;
            orderedRows = allRows.slice().sort((a, b) => {
              const av = (a.children[tdIndex]?.textContent || '').trim().toLowerCase();
              const bv = (b.children[tdIndex]?.textContent || '').trim().toLowerCase();
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
              return 0;
            });
          }
          page = 1;
          renderPage();
          return;
        }

        const viewBtn = e.target.closest('[data-mockup-action="view"]');
        if (viewBtn) {
          e.preventDefault();
          e.stopPropagation();
          const tr = viewBtn.closest('tr');
          const idx = Number(viewBtn.getAttribute('data-row'));
          const detailIdx = Number(tr?.getAttribute('data-detail-index'));
          const tableKey = table.getAttribute('data-table-key');

          // Error logs: open side drawer (live app pattern) without wiping the page
          if (tableKey === 'errorLogs' && Number.isFinite(detailIdx) && detailIdx >= 0) {
            let details = [];
            try {
              details = JSON.parse(sessionStorage.getItem(`ph_mockup_details_${tableKey}`) || '[]');
            } catch (_) {}
            if (details[detailIdx]) {
              openErrorLogDrawer(details[detailIdx]);
              const crumbCurrent = root.querySelector('.mockup-breadcrumb-current');
              const h1 = root.querySelector('.page-header-left h1');
              if (crumbCurrent) crumbCurrent.textContent = `Error log — ${details[detailIdx].shortId}`;
              if (h1) h1.textContent = `Error log — ${details[detailIdx].shortId}`;
            }
            return;
          }

          if (Number.isFinite(idx) && typeof options.onViewRow === 'function') {
            options.onViewRow(idx);
          }
          return;
        }
        if (e.target.closest('.mockup-action-menu')) return;
        root.querySelectorAll('.mockup-action-menu-panel').forEach((p) => {
          p.hidden = true;
        });
        root.querySelectorAll('.mockup-action-more').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      },
      { signal },
    );

    renderPage();
  }

  function roleSwitcherLinks(current) {
    const parts = [];
    for (const [key, file] of Object.entries(ROLE_FILES)) {
      if (key === current) continue;
      const label = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const href = isSubpage() ? `../../${file}` : file;
      parts.push(`<a href="${href}">${esc(label)}</a>`);
    }
    return parts.join(' · ');
  }

  function bindThemeToggle(root) {
    root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const html = document.documentElement;
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try {
          localStorage.setItem('placementhub_theme', next);
        } catch (_) {}
      });
    });
  }

  function syncIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function renderHubFeed(profileKey) {
    const feed = (window.PLACEMENTHUB_MOCKUP_HUB_FEEDS || {})[profileKey];
    if (!feed) return '';

    const actionItems = (feed.actions || [])
      .map((item) => {
        const href = pageLink(profileKey, item.href);
        const tone = item.tone || 'warning';
        return `<li>
          <a href="${esc(href)}" class="mockup-hub-feed-item mockup-hub-feed-item--${esc(tone)}">
            <span class="mockup-hub-feed-icon" aria-hidden="true">${iconEl(item.icon || 'circle-alert', 16)}</span>
            <span class="mockup-hub-feed-copy">
              <span class="mockup-hub-feed-title">${esc(item.title)}</span>
              <span class="mockup-hub-feed-detail">${esc(item.detail)}</span>
            </span>
            <span class="mockup-hub-feed-chevron" aria-hidden="true">${iconEl('chevron-right', 16)}</span>
          </a>
        </li>`;
      })
      .join('');

    const activityItems = (feed.activity || [])
      .map((item) => {
        const href = pageLink(profileKey, item.href);
        return `<li>
          <a href="${esc(href)}" class="mockup-hub-feed-item mockup-hub-feed-item--activity">
            <span class="mockup-hub-feed-icon" aria-hidden="true">${iconEl(item.icon || 'activity', 16)}</span>
            <span class="mockup-hub-feed-copy">
              <span class="mockup-hub-feed-title">${esc(item.title)}</span>
              <span class="mockup-hub-feed-detail">${esc(item.detail)}</span>
            </span>
            <span class="mockup-hub-feed-chevron" aria-hidden="true">${iconEl('chevron-right', 16)}</span>
          </a>
        </li>`;
      })
      .join('');

    const actionCount = (feed.actions || []).length;

    return `
      <section class="mockup-hub-feed" aria-label="Attention and recent activity">
        <div class="mockup-hub-feed-panel">
          <div class="mockup-hub-feed-header">
            <h2 class="mockup-hub-feed-heading">
              ${iconEl('circle-alert', 18)}
              Action required
            </h2>
            <span class="mockup-hub-feed-count" title="${actionCount} items needing attention">${actionCount}</span>
          </div>
          <ul class="mockup-hub-feed-list">${actionItems}</ul>
        </div>
        <div class="mockup-hub-feed-panel">
          <div class="mockup-hub-feed-header">
            <h2 class="mockup-hub-feed-heading">
              ${iconEl('activity', 18)}
              Recent activity
            </h2>
          </div>
          <ul class="mockup-hub-feed-list">${activityItems}</ul>
        </div>
      </section>
    `;
  }

  function renderHub(profileKey, profile, menu) {
    const root = document.getElementById('app-root');
    let hubSearch = '';

    function paintHub() {
      const q = hubSearch.trim().toLowerCase();
      const match = (s) => String(s ?? '').toLowerCase().includes(q);
      const quickActions = QUICK_ACTIONS[profileKey] || [];
      const filteredQuick = q ? quickActions.filter((a) => match(a.label) || match(a.href)) : quickActions;

      let sections = menu.sections;
      if (q) {
        sections = menu.sections
          .map((section) => ({
            ...section,
            items: section.items.filter(
              (item) => match(item.label) || match(item.href) || match(section.title),
            ),
          }))
          .filter((section) => section.items.length > 0);
      }

      const gridHtml = sections
        .map(
          (section) => `
        <div class="dashboard-nav-hub-column">
          <h2 class="dashboard-nav-hub-category-title">${esc(section.title)}</h2>
          <ul class="dashboard-nav-hub-list">
            ${section.items
              .map((item) => {
                if (item.disabled) {
                  return `<li><span class="dashboard-nav-hub-link dashboard-nav-hub-link--disabled" aria-disabled="true">
                    <span class="dashboard-nav-hub-link-icon">${iconEl(item.icon, 16)}</span>${esc(item.label)}</span></li>`;
                }
                const href = pageLink(profileKey, item.href);
                return `<li><a href="${esc(href)}" class="dashboard-nav-hub-link">
                  <span class="dashboard-nav-hub-link-icon">${iconEl(item.icon, 16)}</span>${esc(item.label)}</a></li>`;
              })
              .join('')}
          </ul>
        </div>`,
        )
        .join('');

      root.innerHTML = `
<div class="dashboard-nav-hub">
  <header class="dashboard-nav-hub-topbar">
    <div class="dashboard-nav-hub-topbar-left">
      <a href="${esc(homeLink(profileKey))}" class="dashboard-nav-hub-brand">
        <div class="sidebar-logo-icon">P</div>
        <div>
          <div class="dashboard-nav-hub-brand-title">PlacementHub</div>
          <div class="dashboard-nav-hub-brand-sub">Connecting your placement community</div>
        </div>
      </a>
    </div>
    <div class="dashboard-nav-hub-topbar-center">
      <h1 class="dashboard-nav-hub-page-title">${esc(profile.hubTitle)}</h1>
    </div>
    <div class="dashboard-nav-hub-topbar-right">
      <div style="position:relative;display:flex;align-items:center">
        ${iconEl('search', 16)}
        <input id="hub-search" type="search" class="dashboard-nav-hub-search form-input" placeholder="Search screens (e.g. drives)…" value="${esc(hubSearch)}" aria-label="Search dashboard destinations" style="padding-left:2.25rem;margin-left:-1.5rem" />
      </div>
      <a href="${esc(pageLink(profileKey, profile.profileHref))}" class="dashboard-identity-link dashboard-identity-link--hub" title="Profile">
        <div style="flex-shrink:0">${entityLogoHtml(profile) || `<div class="avatar avatar-sm">${esc(profile.initials)}</div>`}</div>
        <div style="font-size:0.8125rem;text-align:right;min-width:0">
          <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(profile.userName)}</div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${esc(profile.roleLabel)}</div>
        </div>
      </a>
      <span class="btn btn-ghost btn-icon notification-bell">${iconEl('bell')}</span>
      <button type="button" class="btn btn-ghost btn-icon" data-theme-toggle aria-label="Toggle theme">${iconEl('sun-moon')}</button>
      <span class="btn btn-secondary btn-sm" style="opacity:0.65;pointer-events:none">Sign out</span>
    </div>
  </header>
  <div class="dashboard-nav-hub-body">
    <p class="dashboard-nav-hub-intro">Open any destination below. Inner pages use the sidebar for that category; use <strong>Home</strong> in the top bar to return here.</p>
    ${renderHubFeed(profileKey)}
    ${
      filteredQuick.length
        ? `<div class="dashboard-nav-hub-actions">${filteredQuick
            .map(
              (a) =>
                `<a href="${esc(pageLink(profileKey, a.href))}" class="dashboard-nav-hub-quick">${esc(a.label)}</a>`,
            )
            .join('')}</div>`
        : ''
    }
    ${q && sections.length === 0 && filteredQuick.length === 0 ? `<p class="text-secondary" style="margin-top:0.75rem">No destinations match “${esc(hubSearch.trim())}”.</p>` : ''}
    <div class="dashboard-nav-hub-grid">${gridHtml}</div>
    <p class="mockup-role-switcher" style="margin-top:2rem;border:none;padding-top:0">Other roles: ${roleSwitcherLinks(profileKey)}</p>
  </div>
</div>`;

      syncIcons();
      bindThemeToggle(root);
      const input = document.getElementById('hub-search');
      if (input) {
        input.focus();
        input.addEventListener('input', (e) => {
          hubSearch = e.target.value;
          paintHub();
          const again = document.getElementById('hub-search');
          if (again) {
            again.focus();
            again.setSelectionRange(again.value.length, again.value.length);
          }
        });
      }
    }

    paintHub();
  }

  function renderInner(profileKey, profile, menu, currentHref) {
    const root = document.getElementById('app-root');
    const found = findItemByHref(menu, currentHref);
    const pageTitle = found?.item?.label || currentHref;
    const sectionId = findSectionIdForHref(menu, currentHref);
    const collapsedKey = 'placementhub_sidebar_collapsed';
    /** @type {{ label: string, href?: string|null }[] | null} */
    let nestTrail = null;
    let detailTitle = null;

    function resolveTableKeyForHref(href) {
      return typeof window.PLACEMENTHUB_MOCKUP_resolveTable === 'function'
        ? window.PLACEMENTHUB_MOCKUP_resolveTable(href)
        : 'generic';
    }

    function renderSidebarNav() {
      const homeHref = homeLink(profileKey);
      let html = `
        <a href="${esc(homeHref)}" class="sidebar-link" title="Home">
          <span class="sidebar-link-icon">${iconEl('home')}</span>
          <span class="sidebar-link-label">Home</span>
        </a>`;

      const renderItem = (item) => {
        const icon = `<span class="sidebar-link-icon">${iconEl(item.icon)}</span>`;
        const label = `<span class="sidebar-link-label">${esc(item.label)}</span>`;
        if (item.disabled) {
          return `<span class="sidebar-link sidebar-link--disabled" title="${esc(item.label)}" aria-disabled="true">${icon}${label}</span>`;
        }
        const active = profile.showFullNav
          ? isItemActiveInMenu(item.href, menu, currentHref)
          : isItemActive(item.href, null, menu, currentHref);
        const href = pageLink(profileKey, item.href);
        return `<a href="${esc(href)}" class="sidebar-link${active ? ' active' : ''}" title="${esc(item.label)}"${active ? ' aria-current="page"' : ''}>${icon}${label}</a>`;
      };

      if (profile.showFullNav) {
        for (const section of menu.sections) {
          html += `<div class="sidebar-section-title">${esc(section.title)}</div>`;
          for (const item of section.items) html += renderItem(item);
        }
      } else {
        const section = menu.sections.find((s) => s.id === sectionId) || menu.sections[0];
        if (section) {
          html += `<div class="sidebar-section-title">${esc(section.title)}</div>`;
          for (const item of section.items) html += renderItem(item);
        }
      }
      return html;
    }

    function paint() {
      const collapsed = localStorage.getItem(collapsedKey) === '1';
      const sectionOptions = menu.sections
        .map(
          (s) =>
            `<option value="${esc(s.id)}"${s.id === sectionId ? ' selected' : ''}>${esc(s.title)}</option>`,
        )
        .join('');

      const displayTitle = detailTitle || pageTitle;
      const crumbs = buildPageBreadcrumbs({
        profileKey,
        menu,
        sectionId,
        pageTitle,
        currentHref,
        nestTrail,
      });

      root.innerHTML = `
<div class="dashboard-layout${collapsed ? ' sidebar-collapsed' : ''}" id="dashboard-layout">
  <aside class="sidebar${collapsed ? ' collapsed' : ''}" id="sidebar">
    <div class="sidebar-toolbar">
      <a href="${esc(homeLink(profileKey))}" class="sidebar-logo" title="PlacementHub home">
        <div class="sidebar-logo-icon">P</div>
        <span class="sidebar-logo-label">PlacementHub</span>
      </a>
      <button type="button" class="btn btn-ghost btn-icon sidebar-collapse-toggle" id="sidebar-toggle" title="${collapsed ? 'Expand menu' : 'Collapse menu'}">
        ${iconEl(collapsed ? 'panel-left' : 'panel-left-close')}
      </button>
    </div>
    <nav class="sidebar-nav">${renderSidebarNav()}</nav>
    <div class="sidebar-footer">
      <a href="${esc(pageLink(profileKey, profile.profileHref))}" class="dashboard-identity-link" title="${esc(profile.roleLabel)}">
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem">
          ${profile.entityLogo ? entityLogoHtml(profile) : `<div class="avatar avatar-md">${esc(profile.initials)}</div>`}
          <div class="sidebar-footer-meta" style="flex:1;min-width:0">
            <div style="font-size:0.875rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(profile.userName)}</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary)">${esc(profile.roleLabel)}</div>
          </div>
          ${iconEl('chevron-right', 16)}
        </div>
      </a>
    </div>
  </aside>
  <div class="main-content">
    <header class="topbar">
      <div class="topbar-left">
        <button type="button" class="btn btn-ghost btn-icon dashboard-mobile-menu-toggle" id="mobile-menu">${iconEl('menu')}</button>
        <div style="margin-left:0.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;min-width:0;flex:1 1 auto">
          <a href="${esc(homeLink(profileKey))}" class="btn btn-ghost btn-sm" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:700;flex-shrink:0">${iconEl('home', 16)} Home</a>
          ${
            !profile.showFullNav
              ? `<label class="topbar-divider-mobile-hide" style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0">
              <span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase">Section</span>
              <select class="mockup-section-select" id="section-select">${sectionOptions}</select>
            </label>`
              : ''
          }
          <div class="topbar-divider-mobile-hide" style="width:1px;height:24px;background:var(--border-default);flex-shrink:0"></div>
          <div style="display:flex;align-items:center;gap:0.75rem;min-width:0;max-width:min(100%,22rem)">
            ${entityLogoHtml(profile) || `<div class="avatar avatar-sm">${esc(profile.initials)}</div>`}
            <div style="min-width:0">
              <h2 style="font-size:1rem;font-weight:700;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(profile.orgTitle)}</h2>
              <p style="margin:0;font-size:0.75rem;color:var(--text-tertiary)">${esc(profile.orgSubtitle)}</p>
            </div>
          </div>
          ${profile.employerCampus ? `<div class="topbar-divider-mobile-hide" style="width:1px;height:24px;background:var(--border-default);margin:0 0.5rem"></div>
            <div style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase">Campus:</span>
            <span style="display:inline-flex;padding:0.25rem 0.75rem;border-radius:4px;background:var(--bg-secondary);border:1px solid var(--border-default);font-size:0.875rem;font-weight:600">All campuses ▼</span></div>` : ''}
          ${profile.academicYear ? `<div class="topbar-divider-mobile-hide" style="width:1px;height:24px;background:var(--border-default);margin:0 0.5rem"></div>
            <div style="display:flex;align-items:center;gap:0.5rem"><span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase">Academic Year:</span>
            <select class="form-input" disabled style="width:auto;padding:0.25rem 0.5rem;font-size:0.875rem;opacity:0.65"><option>${esc(profile.academicYearValue)}</option></select></div>` : ''}
        </div>
      </div>
      <div class="topbar-right">
        <div class="screen-search-inline" style="display:flex;align-items:center;gap:0.35rem;border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0.15rem 0.5rem;background:var(--bg-primary);min-width:min(200px,42vw)">
          ${iconEl('search', 16)}
          <input type="search" class="form-input" placeholder="Search screens…" disabled style="border:none;flex:1;min-width:0;padding:0.35rem;background:transparent" />
        </div>
        ${profile.studentEmail ? `<span class="btn btn-ghost btn-sm">${iconEl('mail', 16)} Email</span>` : ''}
        <button type="button" class="btn btn-ghost btn-icon" data-theme-toggle>${iconEl('sun-moon')}</button>
        <span class="btn btn-ghost btn-icon notification-bell">${iconEl('bell')}</span>
        <span class="btn btn-ghost btn-sm" style="opacity:0.65">Sign Out</span>
      </div>
    </header>
    <main class="page-content">
      ${profile.committeeBanner ? `<div class="card" style="margin:0 0 1rem;padding:0.75rem 1rem;font-size:0.875rem;background:var(--bg-secondary)"><strong>Read-only placement committee view.</strong> You can browse students and applications for your college.</div>` : ''}
      <div class="page-header">
        <div class="page-header-left">
          ${renderBreadcrumbs(crumbs)}
          <h1>${esc(displayTitle)}</h1>
          <p style="margin:0.35rem 0 0;font-size:0.875rem;color:var(--text-tertiary)">${
            nestTrail?.length
              ? 'Detail view (static mock) — use breadcrumbs to go back up the hierarchy.'
              : 'Sample data for layout review — not connected to the live database.'
          }</p>
        </div>
        <div class="page-header-actions">
          ${
            nestTrail?.length
              ? `<button type="button" class="btn btn-ghost btn-sm" id="mockup-crumb-back">${iconEl('arrow-left', 16)} Back to list</button>`
              : `<span class="btn btn-primary btn-sm" style="opacity:0.75;pointer-events:none">${iconEl('plus', 16)} New</span>`
          }
        </div>
      </div>
      ${renderMockTable(currentHref, pageTitle, profileKey)}
    </main>
  </div>
</div>`;

      syncIcons();
      bindThemeToggle(root);
      bindMockTableInteractions(root, {
        onViewRow(rowIndex) {
          const key = resolveTableKeyForHref(currentHref);
          const tables = window.PLACEMENTHUB_MOCKUP_TABLES || {};
          const table = tables[key] || tables.generic;
          const row = table?.rows?.[rowIndex];
          if (!row) return;
          const build =
            typeof window.PLACEMENTHUB_MOCKUP_buildNestedDetailCrumbs === 'function'
              ? window.PLACEMENTHUB_MOCKUP_buildNestedDetailCrumbs
              : null;
          nestTrail = build ? build(key, row, pageTitle) : [{ label: String(row[0] || 'Record') }];
          detailTitle = nestTrail[nestTrail.length - 1]?.label || pageTitle;
          paint();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });

      document.getElementById('mockup-crumb-back')?.addEventListener('click', () => {
        nestTrail = null;
        detailTitle = null;
        paint();
      });

      document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        const next = !(localStorage.getItem(collapsedKey) === '1');
        localStorage.setItem(collapsedKey, next ? '1' : '0');
        paint();
      });
      document.getElementById('mobile-menu')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('mobile-open');
      });
      document.getElementById('section-select')?.addEventListener('change', (e) => {
        const sec = menu.sections.find((s) => s.id === e.target.value);
        const first = sec?.items.find((i) => !i.disabled && !i.href.startsWith('#')) || sec?.items[0];
        if (first && !first.disabled && !first.href.startsWith('#')) {
          window.location.href = pageLink(profileKey, first.href);
        }
      });

      document.title = `PlacementHub — ${displayTitle} (mockup)`;
    }

    paint();
  }

  function render(profileKey) {
    const profile = PROFILES[profileKey];
    const menu = MENUS[profile.menuKey];
    if (!menu) {
      document.getElementById('app-root').innerHTML =
        '<p style="padding:2rem">Menu config missing. Run: node scripts/generate-static-mockup-menus.js</p>';
      return;
    }

    try {
      const t = localStorage.getItem('placementhub_theme');
      if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    } catch (_) {}

    const href = document.body.dataset.mockupHref;
    if (href) {
      renderInner(profileKey, profile, menu, href);
    } else {
      renderHub(profileKey, profile, menu);
    }
  }

  const profileKey = document.body.dataset.mockupRole;
  if (profileKey) render(profileKey);
})();
