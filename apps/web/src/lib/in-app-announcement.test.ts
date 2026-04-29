import { describe, expect, it } from 'vitest';
import { resolveActiveInAppAnnouncement } from './in-app-announcement';
import type { InAppAnnouncementPayload } from '@questia/shared';

describe('resolveActiveInAppAnnouncement', () => {
  const base: InAppAnnouncementPayload = {
    id: 'x',
    title: 'T',
    body: 'B',
    enabled: true,
  };

  it('retourne null si désactivé', () => {
    expect(resolveActiveInAppAnnouncement({ ...base, enabled: false }, new Date(), 'web')).toBeNull();
  });

  it('filtre par plateforme', () => {
    const onlyIos: InAppAnnouncementPayload = { ...base, platforms: ['ios'] };
    expect(resolveActiveInAppAnnouncement(onlyIos, new Date(), 'web')).toBeNull();
    expect(resolveActiveInAppAnnouncement(onlyIos, new Date(), 'ios')).not.toBeNull();
  });

  it('respecte la fenêtre de dates', () => {
    const t0 = new Date('2026-06-01T12:00:00Z');
    const withWindow: InAppAnnouncementPayload = {
      ...base,
      startsAt: '2026-06-02T00:00:00.000Z',
      endsAt: '2026-06-10T00:00:00.000Z',
    };
    expect(resolveActiveInAppAnnouncement(withWindow, t0, 'web')).toBeNull();
    expect(resolveActiveInAppAnnouncement(withWindow, new Date('2026-06-05T12:00:00Z'), 'web')).not.toBeNull();
  });
});
