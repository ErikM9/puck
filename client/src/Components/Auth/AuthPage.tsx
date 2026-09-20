import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

interface AuthPageProps {
  onLogin: (token: string) => void;
}

/* Which form the card is showing, where recover is reached from the forgot link */
type AuthView = 'login' | 'register' | 'recover';

/* The signed-out page: two columns of copy, and the form card that owns the session */
const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="auth-page">

      <div className="auth-welcome">
        <h2 className="auth-col-title">Your Journey Begins</h2>
        <p className="auth-welcome-desc">
          Every great adventure begins with a little curiosity and the right guide.
          Puck is your enchanted study companion — a place where knowledge takes the
          shape of cards, and learning feels less like a chore and more like a game.
        </p>
        <p className="auth-welcome-desc">
          Create your own decks, fill them with whatever you wish to carry in your
          mind, and let Puck help you carry it there. Whether you are preparing for
          an exam, picking up a new language, or simply indulging a hunger for
          knowing things — you are in the right place.
        </p>
        <p className="auth-welcome-desc">
          Sign in to pick up where you left off, or register to begin your first
          deck. It takes a minute to start and a lifetime to finish — your
          knowledge awaits.
        </p>
      </div>

      <div className="auth-games">
        <h2 className="auth-col-title">Three Ways to Study</h2>
        <div className="auth-game-entry">
          <h3 className="auth-game-name">FlashFlip</h3>
          <p className="auth-game-desc">
            Browse your deck one card at a time. Tap to reveal the answer,
            then step forwards or back at your own pace.
          </p>
        </div>
        <div className="auth-game-entry">
          <h3 className="auth-game-name">FlashChoice</h3>
          <p className="auth-game-desc">
            A question appears alongside a handful of options — only one is true.
            Work through every card to complete the round.
          </p>
        </div>
        <div className="auth-game-entry">
          <h3 className="auth-game-name">FlashMatch</h3>
          <p className="auth-game-desc">
            Questions on one side, shuffled answers on the other. Match each pair
            and watch them vanish until the board is clear.
          </p>
        </div>
      </div>

      <div className="auth-form-col">
        <h2 className="auth-form-heading">Welcome to Puck</h2>
        <div className="auth-form-container">
          {/* Recovery takes the whole card, so the tabs step aside while it is open */}
          {view !== 'recover' && (
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={view === 'login'}
              className={`auth-tab ${view === 'login' ? 'active' : ''}`}
              onClick={() => setView('login')}
            >
              Login
            </button>
            <button
              role="tab"
              aria-selected={view === 'register'}
              className={`auth-tab ${view === 'register' ? 'active' : ''}`}
              onClick={() => setView('register')}
            >
              Register
            </button>
          </div>
          )}
          {view === 'login' && (
            <LoginForm onLogin={onLogin} onForgotPassword={() => setView('recover')} />
          )}
          {view === 'register' && (
            <RegisterForm onSwitchToLogin={() => setView('login')} />
          )}
          {view === 'recover' && (
            <ForgotPasswordForm onBackToLogin={() => setView('login')} />
          )}
        </div>
      </div>

    </div>
  );
};

export default AuthPage;
