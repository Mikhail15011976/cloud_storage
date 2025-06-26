import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  CircularProgress,
  Alert,
  Box 
} from '@mui/material';

const LoginForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Сбрасываем ошибку при изменении полей
    if (error) setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Базовая валидация
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    onSubmit(formData).catch(err => {
      setError(err.message || 'Login failed. Please try again.');
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
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
        autoComplete="username"
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
        autoComplete="current-password"
      />
      
      <Button 
        type="submit" 
        variant="contained" 
        fullWidth
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
    </Box>
  );
};

export default LoginForm;