import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from './AuthPage';

/* ── AuthPage ────────────────────────────────────────────────────────────────
   The card swaps forms in place, so these cover which form is mounted for each tab and how
   recovery takes the whole card while it is open
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

/* The card swaps forms in place, so each test asserts what replaced what */
describe('AuthPage', () => {
  const onLogin = vi.fn();

  const renderPage = () => render(<AuthPage onLogin={onLogin} />);

  it('shows the login form with both tabs by default', () => {
    renderPage();

    expect(screen.getByRole('tab', { name: 'Login' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('switches to the register form when the Register tab is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Register' }));

    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('entering recovery hides the tabs and shows the recovery header instead', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }));

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Password Recovery' })).toBeInTheDocument();
  });

  it('"Back to Login" restores the tabs and the login form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }));

    await user.click(screen.getByRole('button', { name: 'Back to Login' }));

    expect(screen.getByRole('tab', { name: 'Login' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Password Recovery' })).not.toBeInTheDocument();
  });
});
