import React from 'react';
import { RegisterForm } from '../components/auth/RegisterForm';

export const Register = () => {
  const handleSubmit = (userData) => {
    console.log('Registration attempt:', userData);
    // Здесь будет вызов API
  };

  return (
    <div>
      <h2>Register</h2>
      <RegisterForm onSubmit={handleSubmit} />
    </div>
  );
};