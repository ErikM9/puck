import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthPageProps {
  onLogin: (token: string) => void; 
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(true);

  const toggleForm = () => {
    setShowLogin(!showLogin);
  };

  const handleLogin = (token: string) => {
    onLogin(token);
  }

  return (
    <div className="auth-page">
      <div className="auth-form-container">
      <h1 className="auth-head">Authentication</h1>
        {showLogin ? <LoginForm onLogin={handleLogin}/> : <RegisterForm />}
        <button onClick={toggleForm} className="toggle-form-btn button">
          {showLogin ? 'Switch to Register' : 'Switch to Login'}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
