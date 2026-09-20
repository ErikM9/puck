import React, { useState } from 'react';
import apiClient from '../../api/client';
import FitText from '../Common/FitText';
import { extractError } from '../Common/apiError';

interface LoginFormProps {
  onLogin: (token: string) => void;
  onForgotPassword: () => void;
}

/* Hands the token up to App on success, which is what flips the whole app to signed in */
const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      onLogin(response.data.token);
    } catch (err) {
      setError(extractError(err, 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="login-email" className="auth-label">Email:</label>
      <input
        id="login-email"
        className="auth-input"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <label htmlFor="login-password" className="auth-label">Password:</label>
      <input
        id="login-password"
        className="auth-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="auth-button button" type="submit" disabled={isLoading}>
        <FitText className="auth-btn-label login" axis="width" max={18} min={10}>Login</FitText>
      </button>
      <button type="button" className="auth-link center" onClick={onForgotPassword}>
        Forgot your password?
      </button>
    </form>
  );
};

export default LoginForm;
