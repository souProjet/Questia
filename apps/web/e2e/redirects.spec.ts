import { test, expect } from '@playwright/test';

test.describe('Redirections Next', () => {
  test('/app/share renvoie vers /app', async ({ request }) => {
    const res = await request.get('/app/share', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    const loc = res.headers()['location'] ?? '';
    expect(loc).toMatch(/\/app\/?(\?.*)?$/);
  });
});
