const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
};

export async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<{ ok: boolean; errors?: string[] }> {
  const valid = messages.filter((m) => typeof m.to === 'string' && m.to.trim().length > 0);
  if (valid.length === 0) return { ok: true };
  /** L’API Expo attend un seul objet ou un tableau racine — pas `{ messages: [...] }`. */
  const payload: ExpoPushMessage | ExpoPushMessage[] = valid.length === 1 ? valid[0]! : valid;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { status?: string; message?: string }[];
    errors?: unknown;
  };
  if (!res.ok) {
    return { ok: false, errors: [JSON.stringify(json)] };
  }
  const errs: string[] = [];
  if (Array.isArray(json.data)) {
    for (const row of json.data) {
      if (row?.status === 'error' && row.message) errs.push(row.message);
    }
  }
  return { ok: errs.length === 0, errors: errs.length ? errs : undefined };
}
