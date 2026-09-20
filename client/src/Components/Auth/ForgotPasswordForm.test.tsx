import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordForm from './ForgotPasswordForm';

import apiClient from '../../api/client';

/* ── ForgotPasswordForm ──────────────────────────────────────────────────────
   The three-step recovery panel rendered alone with the API stubbed, covering each step,
   the six-digit boundary on the code, and what the user is told when a step is refused
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);
const GENERIC = 'If that email is registered, a recovery code has been sent.';

describe('ForgotPasswordForm', () => {
  const onBackToLogin = vi.fn();

  const renderForm = () => render(<ForgotPasswordForm onBackToLogin={onBackToLogin} />);

  /* Drives the wizard from the email step onto the code step */
  const reachCodeStep = async (user: ReturnType<typeof userEvent.setup>) => {
    mockedPost.mockResolvedValueOnce({ data: { message: GENERIC } });
    await user.type(screen.getByLabelText('Email:'), 'muki@example.com');
    await user.click(screen.getByRole('button', { name: 'Get Code' }));
    await act(async () => {});
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('walks the full recovery flow: email, then code, then the new password', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole('heading', { name: 'Password Recovery' })).toBeInTheDocument();

    await reachCodeStep(user);
    expect(mockedPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'muki@example.com' });
    /* The confirmation is appended to the step's own copy, so the bubble is read whole */
    expect(document.querySelector('.recover-desc')).toHaveTextContent(GENERIC);

    const codeInput = screen.getByLabelText('Recovery Code:');
    await user.type(codeInput, '12ab34');
    expect(codeInput).toHaveValue('1234');
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
    await user.type(codeInput, '56');
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    expect(verifyButton).toBeEnabled();

    mockedPost.mockResolvedValueOnce({ data: { message: 'Code verified.' } });
    await user.click(verifyButton);
    await act(async () => {});
    expect(mockedPost).toHaveBeenCalledWith('/auth/verify-reset-code', {
      email: 'muki@example.com',
      code: '123456',
    });

    mockedPost.mockResolvedValueOnce({
      data: { message: 'Password reset successful! Please log in.' },
    });
    await user.type(screen.getByLabelText('New Password:'), 'newpass1');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await act(async () => {});

    expect(mockedPost).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'muki@example.com',
      code: '123456',
      newPassword: 'newpass1',
    });

    /* The panel hands straight back, which is why its control stays pressed until login */
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the API error and stays on the code step when verification fails', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachCodeStep(user);

    mockedPost.mockRejectedValueOnce({
      response: { data: { message: 'Invalid or expired code.' } },
    });
    await user.type(screen.getByLabelText('Recovery Code:'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired code.');
    expect(screen.getByLabelText('Recovery Code:')).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password:')).not.toBeInTheDocument();
  });

  it('"Resend" requests a fresh code without leaving the code step', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachCodeStep(user);

    mockedPost.mockResolvedValueOnce({ data: { message: GENERIC } });
    await user.click(screen.getByRole('button', { name: 'Resend' }));

    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(mockedPost).toHaveBeenLastCalledWith('/auth/forgot-password', {
      email: 'muki@example.com',
    });
    expect(screen.getByLabelText('Recovery Code:')).toBeInTheDocument();
  });

  /* ── Step one, refused before it is sent ────────────────────────────────── */
  it('refuses a malformed address without troubling the server', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Email:'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Get Code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('keeps the visitor on the first step when the request itself fails', async () => {
    const user = userEvent.setup();
    renderForm();

    mockedPost.mockRejectedValueOnce({ response: { data: { message: 'Internal server error' } } });
    await user.type(screen.getByLabelText('Email:'), 'muki@example.com');
    await user.click(screen.getByRole('button', { name: 'Get Code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
    expect(screen.queryByLabelText('Recovery Code:')).not.toBeInTheDocument();
  });

  /* ── Step two, the six-digit boundary ───────────────────────────────────── */
  it('holds Verify closed at five digits and opens it at six', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachCodeStep(user);
    const field = screen.getByLabelText('Recovery Code:');

    await user.type(field, '12345');
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();

    await user.type(field, '6');
    expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled();
  });

  it('stops at six digits however many are typed', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachCodeStep(user);
    const field = screen.getByLabelText('Recovery Code:');

    await user.type(field, '1234567890');
    expect(field).toHaveValue('123456');
  });

  /* ── Step three, refused ────────────────────────────────────────────────── */
  it('a rejected reset reports the reason and stays on the password step', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachCodeStep(user);

    mockedPost.mockResolvedValueOnce({ data: { message: 'Code verified.' } });
    await user.type(screen.getByLabelText('Recovery Code:'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await act(async () => {});

    mockedPost.mockRejectedValueOnce({
      response: { data: { message: 'Password must be at least 6 characters long' } },
    });
    await user.type(await screen.findByLabelText('New Password:'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('at least 6 characters');
    expect(onBackToLogin).not.toHaveBeenCalled();
    expect(screen.getByLabelText('New Password:')).toBeInTheDocument();
  });

  it('"Back to Login" exits immediately without firing any request', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Back to Login' }));

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
