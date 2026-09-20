import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';
import FitText from '../Common/FitText';
import { extractError } from '../Common/apiError';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

/* Creates the account, then hands over to the login tab once the message has been read */
const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* Held so the handover can be cancelled if the form goes away before it fires */
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', { email, password });
      setSuccess(response.data.message);
      switchTimer.current = setTimeout(() => onSwitchToLogin(), 2000);
    } catch (err) {
      setError(extractError(err, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="register-email" className="auth-label">Email:</label>
      <input
        id="register-email"
        className="auth-input"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <label htmlFor="register-password" className="auth-label">Password:</label>
      <input
        id="register-password"
        className="auth-input"
        type="password"
        placeholder="At least 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      {error && <p className="error-message" role="alert">{error}</p>}
      {success && <p className="success-message" role="status">{success}</p>}
      {/* Stays disabled after success, since the handover to login is already on its way */}
      <button className="auth-button button" type="submit" disabled={isLoading || !!success}>
        <FitText className="auth-btn-label reg" axis="width" max={16.5} min={10}>Register</FitText>
      </button>
      <p className="auth-form-tip">
        <span className="auth-tip-key">Tip:</span> mix letters, numbers &amp; symbols.
      </p>
    </form>
  );
};

export default RegisterForm;
