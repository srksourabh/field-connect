/** Sanitize a cell value to prevent CSV injection */
function sanitizeCell(cell: string): string {
  let sanitized = cell.replace(/"/g, '""');
  // Prevent CSV injection: prefix formula-triggering characters with a single quote
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  return `"${sanitized}"`;
}

export async function exportToCsv(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  const csvContent = [
    headers.map(sanitizeCell).join(","),
    ...rows.map((row) => row.map(sanitizeCell).join(",")),
  ].join("\n");

  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });

  // Programmatic link click — triggers direct file download on all platforms
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  // Delay cleanup to let mobile browsers start the download
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}
