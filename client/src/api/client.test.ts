import apiClient from './client';

/* ── client ──────────────────────────────────────────────────────────────────
   The real axios instance with only its network adapter stubbed, so both interceptors run
   as they would in the browser, including the 401 that belongs to a form rather than here
   ───────────────────────────────────────────────────────────────────────── */

/* Exercises the real axios instance and its interceptors; only the network adapter is stubbed */
const adapter = vi.fn();

const okResponse = (config: unknown) => ({
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

describe('apiClient interceptors', () => {
  beforeEach(() => {
    apiClient.defaults.adapter = adapter;
  });

  it('attaches the stored JWT as a Bearer header on every request', async () => {
    localStorage.setItem('token', 'jwt-abc');
    adapter.mockImplementationOnce(async (config) => okResponse(config));

    await apiClient.get('/decks');

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('sends no Authorization header when no token is stored', async () => {
    adapter.mockImplementationOnce(async (config) => okResponse(config));

    await apiClient.get('/decks');

    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it('a 401 response clears the token and redirects to the auth page', async () => {
    localStorage.setItem('token', 'expired');
    const realLocation = window.location;
    /* jsdom cannot navigate, so a writable stand-in observes the redirect and is always restored */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { href: '/decks' };

    try {
      adapter.mockRejectedValueOnce({ response: { status: 401 } });

      await expect(apiClient.get('/decks')).rejects.toMatchObject({ response: { status: 401 } });
      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = realLocation;
    }
  });

  /* Signing in is allowed to answer 401, and that belongs to the form rather than here */
  it('a 401 from an auth call leaves the page alone so the form can show the error', async () => {
    const realLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { href: '/' };

    try {
      adapter.mockRejectedValueOnce({
        response: { status: 401 },
        config: { url: '/auth/login' },
      });

      await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });
      expect(window.location.href).toBe('/');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = realLocation;
    }
  });

  it('non-401 failures leave the token and the location untouched', async () => {
    localStorage.setItem('token', 'still-valid');
    const realLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { href: '/decks' };

    try {
      adapter.mockRejectedValueOnce({ response: { status: 500 } });

      await expect(apiClient.get('/decks')).rejects.toMatchObject({ response: { status: 500 } });

      expect(localStorage.getItem('token')).toBe('still-valid');
      /* Asserted rather than merely claimed by the name, which said so without checking */
      expect(window.location.href).toBe('/decks');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = realLocation;
    }
  });
});
