import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { TextField } from '@mui/material';

export const RegisterForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    password2: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Full Name"
        name="full_name"
        value={formData.full_name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Confirm Password"
        name="password2"
        type="password"
        value={formData.password2}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
};