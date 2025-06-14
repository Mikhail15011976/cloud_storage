import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';

export const Login = () => {
  const handleSubmit = (credentials) => {
    console.log('Login attempt:', credentials);
    // Здесь будет вызов API
  };

  return (
    <div>
      <h2>Login</h2>
      <LoginForm onSubmit={handleSubmit} />
    </div>
  );
};