import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from './RegisterForm';
import apiClient from '../../api/client';

/* ── RegisterForm ────────────────────────────────────────────────────────────
   Registration on its own, covering the confirmation, the timed handover to the login tab,
   and what happens when the form is dismissed before that handover fires
   ───────────────────────────────────────────────────────────────────────── */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

describe('RegisterForm', () => {
  const onSwitchToLogin = vi.fn();

  const renderForm = () => render(<RegisterForm onSwitchToLogin={onSwitchToLogin} />);

  const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Email:'), 'new@example.com');
    await user.type(screen.getByLabelText('Password:'), 'secret9');
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('on success: shows the message, locks the button, and switches to login after exactly 2s', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedPost.mockResolvedValueOnce({
      data: { message: 'Registration successful! Please log in.' },
    });
    renderForm();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await act(async () => {});

    expect(mockedPost).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'secret9',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Registration successful! Please log in.');
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();

    act(() => { vi.advanceTimersByTime(1999); });
    expect(onSwitchToLogin).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('does not hand over to login if the form is dismissed before the pause elapses', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockedPost.mockResolvedValueOnce({
      data: { message: 'Registration successful! Please log in.' },
    });
    const view = renderForm();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await act(async () => {});
    expect(screen.getByRole('status')).toBeInTheDocument();

    view.unmount();
    act(() => { vi.advanceTimersByTime(2000); });

    expect(onSwitchToLogin).not.toHaveBeenCalled();
  });

  it('surfaces the server-provided message when registration is rejected', async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { message: 'This email is already in use' } },
    });
    const user = userEvent.setup();
    renderForm();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This email is already in use');
    expect(onSwitchToLogin).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the request never reaches the server', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network Error'));
    const user = userEvent.setup();
    renderForm();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Registration failed. Please try again.'
    );
  });
});
