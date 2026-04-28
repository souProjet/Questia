import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPushRemindersWithServer } from './syncPushReminders';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('./pushNotifications', () => ({
  registerForExpoPushTokenAsync: jest.fn(() => Promise.resolve('ExponentPushToken[test]')),
}));

describe('syncPushRemindersWithServer', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('ne fait rien sans jeton Clerk', async () => {
    const ok = await syncPushRemindersWithServer(async () => null);
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enregistre le jeton Expo puis met à jour le profil', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const ok = await syncPushRemindersWithServer(async () => 'clerk-jwt');
    expect(ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const pushCall = fetchMock.mock.calls[0];
    expect(pushCall[0]).toContain('/api/notifications/push-token');
    expect(pushCall[1]?.method).toBe('POST');
    expect((pushCall[1]?.headers as Record<string, string>)?.Authorization).toBe('Bearer clerk-jwt');

    const profileCall = fetchMock.mock.calls[1];
    expect(profileCall[0]).toContain('/api/profile');
    expect(profileCall[1]?.method).toBe('PATCH');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'questia_expo_push_token',
      'ExponentPushToken[test]',
    );
  });

  it("n'écrit pas en AsyncStorage si l'enregistrement push-token échoue", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const ok = await syncPushRemindersWithServer(async () => 'clerk-jwt');
    expect(ok).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
