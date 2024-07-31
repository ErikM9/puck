import React, { useState } from 'react';
import axios from 'axios';

const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_KEY}/auth/register`, {
        email,
        password
      });

      console.log('Registration successful', response.data);
    } catch (error) {
      console.error('Registration failed', error);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <input 
        className="auth-input" 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <input 
        className="auth-input" 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />
      <button className="auth-button button" type="submit">Register</button>
    </form>
  );
};

export default RegisterForm;
