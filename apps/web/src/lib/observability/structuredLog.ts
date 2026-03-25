/**
 * Logs JSON structurés (stdout) pour agrégateurs (Vercel, Datadog, CloudWatch, etc.).
 * Domaines : ia, géocodage, météo — sans contenu utilisateur ni coordonnées précises.
 */

export type ObservabilityDomain = 'ai' | 'geo' | 'weather';

export type ObservabilityLevel = 'info' | 'warn' | 'error';

export type ObservabilityOutcome = 'ok' | 'fallback' | 'miss' | 'degraded' | 'skipped';

export interface StructuredLogLine {
  v: 1;
  service: 'questia-web';
  ts: string;
  domain: ObservabilityDomain;
  operation: string;
  level: ObservabilityLevel;
  outcome?: ObservabilityOutcome;
  durationMs?: number;
  /** Métadonnées sûres (pas de texte de quête, pas de requête brute géo) */
  meta?: Record<string, string | number | boolean | null | undefined>;
  error?: { name: string; message: string };
}

function truncateMessage(msg: string, max = 400): string {
  if (msg.length <= max) return msg;
  return `${msg.slice(0, max)}…`;
}

/**
 * Écrit une ligne JSON. Les erreurs vont sur stderr pour faciliter les alertes.
 */
export function logStructured(
  partial: Omit<StructuredLogLine, 'v' | 'service' | 'ts'> & Partial<Pick<StructuredLogLine, 'v' | 'service' | 'ts'>>,
): void {
  const line: StructuredLogLine = {
    v: 1,
    service: 'questia-web',
    ts: new Date().toISOString(),
    ...partial,
  };
  const text = JSON.stringify(line);
  if (line.level === 'error') {
    console.error(text);
  } else if (line.level === 'warn') {
    console.warn(text);
  } else {
    console.log(text);
  }
}

/** Erreur capturée pour observabilité (message tronqué, pas de stack par défaut). */
export function logStructuredError(
  domain: ObservabilityDomain,
  operation: string,
  err: unknown,
  extra?: {
    outcome?: ObservabilityOutcome;
    durationMs?: number;
    meta?: StructuredLogLine['meta'];
  },
): void {
  const e = err instanceof Error ? err : new Error(String(err));
  logStructured({
    domain,
    operation,
    level: 'error',
    outcome: extra?.outcome ?? 'degraded',
    durationMs: extra?.durationMs,
    meta: extra?.meta,
    error: { name: e.name, message: truncateMessage(e.message) },
  });
}

export async function withTiming<T>(
  domain: ObservabilityDomain,
  operation: string,
  fn: () => Promise<T>,
  options?: {
    /** Si false, ne log pas outcome ok (pour enchaîner un log métier plus précis). */
    logSuccess?: boolean;
    successMeta?: StructuredLogLine['meta'];
  },
): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - t0);
    if (options?.logSuccess !== false) {
      logStructured({
        domain,
        operation,
        level: 'info',
        outcome: 'ok',
        durationMs,
        meta: options?.successMeta,
      });
    }
    return result;
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    logStructuredError(domain, operation, err, { durationMs, outcome: 'degraded' });
    throw err;
  }
}
