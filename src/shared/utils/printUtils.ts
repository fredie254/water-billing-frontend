/** Trigger the browser print dialog (user can choose Print or Save as PDF). */
export function triggerPrint() {
  window.print();
}

/**
 * Download rows as a styled Excel (.xls) file.
 * Odd rows = white, even rows = light blue — matching the on-screen table striping.
 * Excel opens HTML tables natively when saved with the .xls extension.
 */
export function downloadExcel(
  rows: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>,
) {
  if (rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  const labels = keys.map((k) => headers?.[k] ?? k);

  // Styles
  const S = {
    th:   'background:#1d4ed8;color:#ffffff;font-weight:bold;padding:9px 14px;border:1px solid #1e40af;font-size:13px;font-family:Calibri,Arial,sans-serif;white-space:nowrap;',
    odd:  'background:#ffffff;color:#1e293b;padding:8px 14px;border:1px solid #dbeafe;font-size:13px;font-family:Calibri,Arial,sans-serif;',
    even: 'background:#eff6ff;color:#1e293b;padding:8px 14px;border:1px solid #dbeafe;font-size:13px;font-family:Calibri,Arial,sans-serif;',
  };

  const headerRow = `<tr>${labels.map((h) => `<th style="${S.th}">${h}</th>`).join('')}</tr>`;

  const dataRows = rows
    .map((row, i) => {
      const style = i % 2 === 0 ? S.odd : S.even;
      const cells = keys.map((k) => {
        const val = row[k] ?? '';
        return `<td style="${style}">${String(val)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; }
    body  { font-family: Calibri, Arial, sans-serif; }
  </style>
</head>
<body>
  <table>${headerRow}${dataRows}</table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = filename.replace(/\.(csv|xls|xlsx)$/, '');
  link.href     = url;
  link.download = `${name}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download rows as a plain CSV file (no styling).
 * Use downloadExcel() instead when colour formatting is needed.
 */
export function downloadCsv(
  rows: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>,
) {
  if (rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  const headerRow = keys.map((k) => headers?.[k] ?? k).join(',');

  const csvRows = rows.map((row) =>
    keys.map((k) => {
      const val = row[k];
      const str = val == null ? '' : String(val);
      return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','),
  );

  const csv  = [headerRow, ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
