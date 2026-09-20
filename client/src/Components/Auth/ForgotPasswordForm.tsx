import React, { useState } from 'react';
import apiClient from '../../api/client';
import FitText from '../Common/FitText';
import { extractError } from '../Common/apiError';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

/* Three steps in one panel: ask for a code, prove it, then spend it on a new password */
type Step = 'email' | 'code' | 'password';

/* One block of copy per step, each written to fill the same bubble at the same size */
const STEP_COPY: Record<Step, string> = {
  email:
    'Forgot your password? Enter the email tied to your account below and we\u2019ll send a ' +
    'one-time 6-digit code \u2014 valid for 15 minutes \u2014 to verify it\u2019s you and choose a ' +
    'brand-new password. Codes usually arrive within a minute or two \u2014 if nothing shows\u00a0up, ' +
    'check your spam folder.',
  code:
    'A 6-digit code is on its way to that address. Type it in below to confirm the account ' +
    'is yours. It lasts 15 minutes, can only be used once, and five wrong guesses retire it ' +
    'for good. Nothing on the account changes until you choose the new password\u00a0yourself.',
  password:
    'That code checked out, so the account is yours to reclaim. Choose a new password of at ' +
    'least six characters, ideally one you have not used here before, and enter it below. Your ' +
    'old password stops working the moment this is saved, and we will take you straight back to ' +
    'the login screen to sign\u00a0in.',
};

/* Caught here as well as on the server, since there is nothing to send to a bad address */
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* Recovery in one panel, where only the form underneath the copy changes per step */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [step, setStep]               = useState<Step>('email');
  const [email, setEmail]             = useState('');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [info, setInfo]               = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(false);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setInfo(response.data.message);
      setStep('code');
    } catch (err) {
      setError(extractError(err, 'Could not request a code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/verify-reset-code', { email, code });
      setInfo(null);
      setStep('password');
    } catch (err) {
      setError(extractError(err, 'Invalid or expired code.'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email, code, newPassword });
      /* Left loading on purpose, so the control stays pressed until login takes the panel */
      onBackToLogin();
    } catch (err) {
      setError(extractError(err, 'Could not reset the password. Please try again.'));
      setIsLoading(false);
    }
  };

  /* Only the form swaps between steps, while the heading and the copy above it stay put */
  const renderStep = () => {
    if (step === 'email') {
      return (
        <form className="auth-form" onSubmit={requestCode} noValidate>
          <label htmlFor="recover-email" className="auth-label">Email:</label>
          <input
            id="recover-email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="auth-recovery-btn" type="submit" disabled={isLoading}>
            <FitText className="auth-btn-label" axis="width" max={16.5} min={10}>Get Code</FitText>
          </button>
          <button type="button" className="auth-backlink" onClick={onBackToLogin}>
            Back to Login
          </button>
        </form>
      );
    }

    if (step === 'code') {
      return (
        <form className="auth-form" onSubmit={verifyCode} noValidate>
          <label htmlFor="recover-code" className="auth-label">Recovery Code:</label>
          <input
            id="recover-code"
            className="auth-input"
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoComplete="one-time-code"
            required
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="auth-recovery-row">
            <button className="auth-recovery-btn" type="submit"
              disabled={isLoading || code.length !== 6}>
              <FitText className="auth-btn-label" axis="width" max={16.5} min={10}>Verify</FitText>
            </button>
            <button type="button" className="auth-recovery-btn"
              onClick={() => requestCode()} disabled={isLoading}>
              <FitText className="auth-btn-label" axis="width" max={16.5} min={10}>Resend</FitText>
            </button>
          </div>
          <button type="button" className="auth-backlink" onClick={onBackToLogin}>
            Back to Login
          </button>
        </form>
      );
    }

    if (step === 'password') {
      return (
        <form className="auth-form" onSubmit={resetPassword} noValidate>
          <label htmlFor="recover-password" className="auth-label">New Password:</label>
          <input
            id="recover-password"
            className="auth-input"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="auth-recovery-btn" type="submit" disabled={isLoading}>
            <FitText className="auth-btn-label" axis="width" max={16.5} min={10}>Reset</FitText>
          </button>
          <button type="button" className="auth-backlink" onClick={onBackToLogin}>
            Back to Login
          </button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className="recover-root">
      <h3 className="recover-title">Password Recovery</h3>
      <FitText className="recover-desc" max={12} min={9} centreBox basePad={2}>
        {/* The confirmation joins the copy, so the two never sit on top of each other */}
        {info ? `${STEP_COPY[step]} ${info}` : STEP_COPY[step]}
      </FitText>
      {renderStep()}
    </div>
  );
};

export default ForgotPasswordForm;
