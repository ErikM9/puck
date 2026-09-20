import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import apiClient from '../../api/client';

/* ── LoginForm ───────────────────────────────────────────────────────────────
   Sign-in on its own with the API stubbed, covering the token handed upward, the message
   shown when it is refused, and the pending state in between
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

describe('LoginForm', () => {
  const onLogin = vi.fn();
  const onForgotPassword = vi.fn();

  const renderForm = () =>
    render(<LoginForm onLogin={onLogin} onForgotPassword={onForgotPassword} />);

  const fillCredentials = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Email:'), 'muki@example.com');
    await user.type(screen.getByLabelText('Password:'), 'hunter22');
  };

  it('submits the entered credentials and passes the returned token to onLogin', async () => {
    mockedPost.mockResolvedValueOnce({ data: { token: 'jwt-123' } });
    const user = userEvent.setup();
    renderForm();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'muki@example.com',
      password: 'hunter22',
    });
    expect(onLogin).toHaveBeenCalledWith('jwt-123');
  });

  it('surfaces the server-provided message when login is rejected', async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password' } },
    });
    const user = userEvent.setup();
    renderForm();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the request never reaches the server', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    renderForm();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Login failed. Please try again.');
  });

  it('disables the button while the request is pending, without changing its label', async () => {
    let resolveLogin!: (value: unknown) => void;
    mockedPost.mockImplementationOnce(
      () => new Promise(resolve => { resolveLogin = resolve; })
    );
    const user = userEvent.setup();
    renderForm();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Login' }));

    const pendingButton = screen.getByRole('button', { name: 'Login' });
    expect(pendingButton).toBeDisabled();

    await act(async () => { resolveLogin({ data: { token: 't' } }); });
    expect(onLogin).toHaveBeenCalledWith('t');
  });

  it('clicking "Forgot your password?" invokes onForgotPassword without submitting', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }));

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
