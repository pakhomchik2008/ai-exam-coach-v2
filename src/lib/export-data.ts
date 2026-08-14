/**
 * Dump this student's PERSONAL_DATA_KEYS as a JSON file.
 * Settings "Export data" — a local snapshot, not a GDPR package from the server.
 */
export function exportPersonalData(): void {
  const keys = (window as Window & { PERSONAL_DATA_KEYS?: string[] }).PERSONAL_DATA_KEYS || [];
  const dump: { exportedAt: string; keys: Record<string, unknown> } = {
    exportedAt: new Date().toISOString(),
    keys: {},
  };
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      dump.keys[key] = raw ? JSON.parse(raw) : null;
    } catch {
      dump.keys[key] = null;
    }
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exam-coach-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
