import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import apiClient from './api/client';

/* ── App ─────────────────────────────────────────────────────────────────────
   The router, the session and the pages wired together with only the API stubbed, so these
   cover where each route lands for a given combination of signed-in and deck-selected
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('./api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

/* App owns its BrowserRouter, so the entry point is set through the address bar */
const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

const asLoggedIn = () => localStorage.setItem('token', 'jwt-abc');

describe('App routing', () => {
  beforeEach(() => {
    mockedGet.mockResolvedValue({ data: [] });
  });

  it('shows the auth page to a signed-out visitor', async () => {
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Welcome to Puck' })).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor back to the auth page from a protected route', async () => {
    renderAt('/home');

    expect(await screen.findByRole('heading', { name: 'Welcome to Puck' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('sends a signed-in visitor from the auth page to home, and loads their decks', async () => {
    asLoggedIn();
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/decks'));
  });

  it('keeps the games out of reach until a deck is selected', async () => {
    asLoggedIn();
    renderAt('/game-menu');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Game Menu' })).not.toBeInTheDocument();
  });

  it('redirects each game route the same way when nothing is selected', async () => {
    asLoggedIn();
    for (const path of ['/flash-flip', '/flash-choice', '/flash-match']) {
      const view = renderAt(path);
      expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('lands an unknown path on home when signed in and on the auth page when not', async () => {
    asLoggedIn();
    const signedIn = renderAt('/nonsense');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    signedIn.unmount();

    localStorage.clear();
    renderAt('/nonsense');
    expect(await screen.findByRole('heading', { name: 'Welcome to Puck' })).toBeInTheDocument();
  });

  it('shows the navbar logout only once signed in', async () => {
    /* Unmounted first, or both apps are mounted and a query cannot say which answered */
    const signedOut = renderAt('/');
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    signedOut.unmount();

    asLoggedIn();
    renderAt('/home');
    expect(await screen.findByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('logging out clears the token and returns to the auth page', async () => {
    asLoggedIn();
    const user = userEvent.setup();
    renderAt('/home');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Welcome to Puck' })).toBeInTheDocument();
  });

  it('survives a failed deck fetch without blanking the page', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));
    asLoggedIn();

    renderAt('/home');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    consoleError.mockRestore();
  });
});
