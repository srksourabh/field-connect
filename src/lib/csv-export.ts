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

  // Web Share API (files) — works on iOS 15+ and Android Chrome; preferred on mobile
  if (typeof navigator !== "undefined" && navigator.canShare) {
    const file = new File([blob], filename, { type: "text/csv" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e) {
        // User cancelled share — do not fall through to download
        if ((e as Error).name === "AbortError") return;
        // Other error — fall through to link download
      }
    }
  }

  // Fallback: programmatic link click (desktop browsers, Android older versions)
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
