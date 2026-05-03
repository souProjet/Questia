import { describe, expect, it } from 'vitest';
import { parseInAppAnnouncementPayload } from './inAppAnnouncement';

describe('parseInAppAnnouncementPayload', () => {
  it('rejette null et non-objet', () => {
    expect(parseInAppAnnouncementPayload(null)).toBeNull();
    expect(parseInAppAnnouncementPayload(undefined)).toBeNull();
    expect(parseInAppAnnouncementPayload('x')).toBeNull();
    expect(parseInAppAnnouncementPayload([])).toBeNull();
  });

  it('rejette id ou titre manquant', () => {
    expect(
      parseInAppAnnouncementPayload({ id: '', title: 'T', body: '', enabled: true }),
    ).toBeNull();
    expect(
      parseInAppAnnouncementPayload({ id: '  ', title: 'T', body: '', enabled: true }),
    ).toBeNull();
    expect(
      parseInAppAnnouncementPayload({ id: 'a', title: '', body: '', enabled: true }),
    ).toBeNull();
  });

  it('rejette titre ou corps trop longs', () => {
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 'x'.repeat(201),
        body: '',
        enabled: true,
      }),
    ).toBeNull();
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 'ok',
        body: 'y'.repeat(20001),
        enabled: true,
      }),
    ).toBeNull();
  });

  it('accepte un payload minimal', () => {
    const p = parseInAppAnnouncementPayload({
      id: ' id1 ',
      title: ' T ',
      body: 'hello',
      enabled: true,
    });
    expect(p).toEqual({
      id: 'id1',
      title: 'T',
      body: 'hello',
      enabled: true,
      startsAt: undefined,
      endsAt: undefined,
      platforms: undefined,
    });
  });

  it('normalise startsAt / endsAt (undefined, null, ISO valide)', () => {
    const withUndefined = parseInAppAnnouncementPayload({
      id: 'a',
      title: 't',
      body: '',
      enabled: false,
    });
    expect(withUndefined?.startsAt).toBeUndefined();
    expect(withUndefined?.endsAt).toBeUndefined();

    const withNull = parseInAppAnnouncementPayload({
      id: 'a',
      title: 't',
      body: '',
      enabled: false,
      startsAt: null,
      endsAt: null,
    });
    expect(withNull?.startsAt).toBeNull();
    expect(withNull?.endsAt).toBeNull();

    const iso = '2026-01-15T12:00:00.000Z';
    const withDates = parseInAppAnnouncementPayload({
      id: 'a',
      title: 't',
      body: '',
      enabled: true,
      startsAt: iso,
      endsAt: iso,
    });
    expect(withDates?.startsAt).toBe(iso);
    expect(withDates?.endsAt).toBe(iso);
  });

  it('rejette dates invalides ou chaînes vides', () => {
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 't',
        body: '',
        enabled: true,
        startsAt: 'not-a-date',
      }),
    ).toBeNull();
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 't',
        body: '',
        enabled: true,
        startsAt: '   ',
      }),
    ).toBeNull();
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 't',
        body: '',
        enabled: true,
        endsAt: 123 as unknown as string,
      }),
    ).toBeNull();
  });

  it('plateformes : absentes, null, tableau valide, filtrage', () => {
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 't',
        body: '',
        enabled: true,
        platforms: ['ios', 'bogus', 'web'],
      })?.platforms,
    ).toEqual(['ios', 'web']);

    const allInvalid = parseInAppAnnouncementPayload({
      id: 'a',
      title: 't',
      body: '',
      enabled: true,
      platforms: ['bogus'],
    });
    expect(allInvalid?.platforms).toBeNull();
  });

  it('rejette platforms non-tableau', () => {
    expect(
      parseInAppAnnouncementPayload({
        id: 'a',
        title: 't',
        body: '',
        enabled: true,
        platforms: 'ios' as unknown as string[],
      }),
    ).toBeNull();
  });
});
