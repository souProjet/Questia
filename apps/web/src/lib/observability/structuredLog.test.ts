import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logStructured, logStructuredError, withTiming } from './structuredLog';

describe('structuredLog', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logStructured écrit du JSON avec v, service, domain, operation', () => {
    logStructured({
      domain: 'weather',
      operation: 'owm.test',
      level: 'info',
      outcome: 'ok',
      meta: { x: 1 },
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(line.v).toBe(1);
    expect(line.service).toBe('questia-web');
    expect(line.domain).toBe('weather');
    expect(line.operation).toBe('owm.test');
    expect(line.level).toBe('info');
    expect(line.outcome).toBe('ok');
    expect(line.meta).toEqual({ x: 1 });
    expect(typeof line.ts).toBe('string');
  });

  it('niveau error utilise console.error', () => {
    logStructured({
      domain: 'ai',
      operation: 'x',
      level: 'error',
      outcome: 'miss',
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('niveau warn utilise console.warn', () => {
    logStructured({
      domain: 'geo',
      operation: 'x',
      level: 'warn',
      outcome: 'miss',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('logStructuredError sérialise une Error', () => {
    logStructuredError('geo', 'nominatim', new Error('boom'), { durationMs: 12 });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line.error).toEqual({ name: 'Error', message: 'boom' });
    expect(line.durationMs).toBe(12);
  });

  it('logStructuredError accepte une valeur non-Error', () => {
    logStructuredError('weather', 'owm', 'string err');
    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line.error.message).toBe('string err');
  });
});

describe('withTiming', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne le résultat et log success', async () => {
    const r = await withTiming('ai', 'op', async () => 42);
    expect(r).toBe(42);
  });

  it('relance l’erreur après log', async () => {
    await expect(
      withTiming('geo', 'op', async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');
  });
});
