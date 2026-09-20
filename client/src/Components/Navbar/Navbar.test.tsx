import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

/* ── Navbar ──────────────────────────────────────────────────────────────────
   The brand is always present and only the logout control depends on the session, so these
   cover both states and the accessibility guarantee on the decorative images
   ───────────────────────────────────────────────────────────────────────── */

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

/* The brand is always present; only the logout control depends on the session */
describe('Navbar', () => {
  const onLogout = vi.fn();

  const renderNavbar = (isLoggedIn: boolean) =>
    render(
      <MemoryRouter>
        <Navbar isLoggedIn={isLoggedIn} onLogout={onLogout} />
      </MemoryRouter>
    );

  it('shows the brand but no logout button when logged out', () => {
    renderNavbar(false);

    expect(screen.getByText('Puck')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('shows the brand and the logout button when logged in', () => {
    renderNavbar(true);

    expect(screen.getByText('Puck')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('hides the decorative fairies from assistive technology', () => {
    const { container } = renderNavbar(true);

    const fairies = container.querySelectorAll('.navbar-fairy');
    expect(fairies).toHaveLength(2);
    for (const fairy of fairies) {
      expect(fairy).toHaveAttribute('aria-hidden', 'true');
      expect(fairy).toHaveAttribute('alt', '');
    }
  });

  it('logging out invokes onLogout and navigates to the auth page', async () => {
    const user = userEvent.setup();
    renderNavbar(true);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
