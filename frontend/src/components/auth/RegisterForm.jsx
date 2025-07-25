import React, { useState } from 'react';
import { TextField, Button, CircularProgress, Alert } from '@mui/material';

const RegisterForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });    
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();    
    if (formData.password !== formData.password2) {
      setError('Пароли не совпадают');
      return;
    }    
    if (!formData.username || !formData.email || !formData.password) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }    
    console.log('Sending registration data:', {
      username: formData.username,
      email: formData.email,
      full_name: formData.full_name,
      password: formData.password,
      confirm_password: formData.password2
    });    
    onSubmit({
      username: formData.username,
      email: formData.email,
      full_name: formData.full_name,
      password: formData.password,
      confirm_password: formData.password2 
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        disabled={loading}
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
        disabled={loading}
      />
      <TextField
        label="Full Name"
        name="full_name"
        value={formData.full_name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        disabled={loading}
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
        disabled={loading}
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
        disabled={loading}
      />
      <Button 
        type="submit" 
        variant="contained" 
        fullWidth
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Register'}
      </Button>
    </form>
  );
};

export default RegisterForm;
