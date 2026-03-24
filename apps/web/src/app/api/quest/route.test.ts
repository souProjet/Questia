import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/quest', () => {
  it('retourne une quête pour un corps valide', async () => {
    const body = {
      declaredPersonality: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        emotionalStability: 0.5,
        thrillSeeking: 0.5,
        boredomSusceptibility: 0.5,
      },
      questLogs: [],
      currentDay: 4,
      allowOutdoor: true,
    };
    const req = new NextRequest('http://localhost/api/quest', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quest).toBeDefined();
    expect(json.phase).toBeDefined();
  });

  it('500 si JSON invalide', async () => {
    const req = new NextRequest('http://localhost/api/quest', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
