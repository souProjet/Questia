import { sendReminderEmail } from '@/lib/reminders/send-email';
import { prisma } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://questia.fr';

const QUADRANT_LABELS: Record<string, { label: string }> = {
  explorer_risktaker:  { label: 'Aventurier audacieux' },
  explorer_cautious:   { label: 'Explorateur prudent' },
  homebody_risktaker:  { label: 'Rebelle casanier' },
  homebody_cautious:   { label: 'Cocon tranquille' },
};

function buildNewUserEmail(
  explorerAxis: string,
  riskAxis: string,
  totalUsers: number,
  ts: string,
): string {
  const q = QUADRANT_LABELS[`${explorerAxis}_${riskAxis}`]
    ?? { label: `${explorerAxis} / ${riskAxis}` };

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%">

        <!-- Header bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#134e4a,#c2410c,#166534);border-radius:8px 8px 0 0"></td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;padding:32px 28px 28px;border-radius:0 0 8px 8px">

          <!-- Logo + title -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:22px;font-weight:800;color:#0a0a0f;letter-spacing:-0.3px">
                <span style="color:#134e4a">Q</span>uestia
              </td>
              <td align="right" style="font-size:11px;color:#a1a1aa">${ts}</td>
            </tr>
          </table>

          <!-- Divider -->
          <div style="height:1px;background:#e4e4e7;margin:16px 0 20px"></div>

          <!-- Big number -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:8px 0 16px">
                <div style="font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.8px">Nouvel utilisateur</div>
                <div style="font-size:48px;font-weight:800;color:#0a0a0f;line-height:1.1;margin-top:4px">#${totalUsers}</div>
              </td>
            </tr>
          </table>

          <!-- Quadrant pill -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 0 24px">
                <div style="display:inline-block;background:#f4f4f5;border-radius:20px;padding:8px 20px;font-size:15px;font-weight:700;color:#27272a">
                  ${q.label}
                </div>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="${siteUrl}/admin"
                   style="display:inline-block;background:#0a0a0f;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:10px;letter-spacing:0.2px">
                  Voir la console admin &rarr;
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 0 0;text-align:center;font-size:11px;color:#a1a1aa">
          Notification automatique &middot; Questia
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Fire-and-forget email to all admin profiles when a new user signs up.
 * Failures are silently ignored — user creation must never be blocked.
 */
export async function notifyAdminNewUser(
  profileId: string,
  explorerAxis: string,
  riskAxis: string,
): Promise<void> {
  const admins = await prisma.profile.findMany({
    where: { role: 'admin' },
    select: { clerkId: true },
  });
  if (!admins.length) return;

  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();

  const totalUsers = await prisma.profile.count();
  const ts = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
  const subject = `Nouvel utilisateur Questia (#${totalUsers})`;
  const html = buildNewUserEmail(explorerAxis, riskAxis, totalUsers, ts);

  await Promise.allSettled(
    admins.map(async (admin) => {
      const user = await client.users.getUser(admin.clerkId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) await sendReminderEmail(email, subject, html);
    }),
  );
}
