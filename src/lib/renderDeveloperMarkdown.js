/**
 * Minimal markdown → HTML for Developer docs (headings, tables, lists, code, links).
 */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * @param {string} markdown
 * @returns {string} HTML fragment (no outer document)
 */
export function renderDeveloperMarkdown(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const out = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let inUl = false;
  let tableRows = [];

  const closeUl = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter((row) => !row.every((c) => /^:?-+:?$/.test(c)));
    if (!rows.length) {
      tableRows = [];
      return;
    }
    out.push('<div class="dev-md-table-wrap"><table class="dev-md-table">');
    rows.forEach((row, i) => {
      const cells = row.map((c) => inlineMarkdown(c));
      if (i === 0) {
        out.push('<thead><tr>' + cells.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>');
      }
    });
    out.push('</tbody></table></div>');
    tableRows = [];
  };

  for (const line of lines) {
    if (inCode) {
      if (line.trim().startsWith('```')) {
        out.push(`<pre class="dev-md-pre"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
        codeLang = '';
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (line.trim().startsWith('```')) {
      closeUl();
      flushTable();
      inCode = true;
      codeLang = line.trim().slice(3).trim();
      continue;
    }

    if (line.trim().startsWith('|')) {
      closeUl();
      tableRows.push(parseTableRow(line));
      if (isTableSeparator(line)) {
        /* keep separator in buffer; flushed with table */
      }
      continue;
    }

    if (tableRows.length) flushTable();

    const trimmed = line.trim();
    if (!trimmed) {
      closeUl();
      continue;
    }

    if (trimmed === '---') {
      closeUl();
      out.push('<hr class="dev-md-hr" />');
      continue;
    }

    const h = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      closeUl();
      const level = h[1].length;
      const id = h[2]
        .toLowerCase()
        .replace(/`/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      out.push(`<h${level} id="${id}" class="dev-md-h${level}">${inlineMarkdown(h[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeUl();
      out.push(`<blockquote class="dev-md-quote">${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!inUl) {
        out.push('<ul class="dev-md-ul">');
        inUl = true;
      }
      out.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      continue;
    }

    closeUl();
    out.push(`<p class="dev-md-p">${inlineMarkdown(trimmed)}</p>`);
  }

  if (tableRows.length) flushTable();
  closeUl();
  if (inCode && codeLines.length) {
    out.push(`<pre class="dev-md-pre"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return out.join('\n');
}
