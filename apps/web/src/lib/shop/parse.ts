export function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      // format legacy non-JSON ; fallback ci-dessous.
    }
    const csv = raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (csv.length > 0) return csv;
  }
  return [];
}
