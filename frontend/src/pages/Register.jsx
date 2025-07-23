import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { register } from '../store/slices/authSlice';
import RegisterForm from '../components/auth/RegisterForm';
import { Container, Box, Typography, Alert } from '@mui/material';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useSelector(state => state.auth);

  const handleSubmit = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(register(userData));
      if (result.payload?.success) {        
        navigate(user?.is_admin ? '/admin' : '/dashboard');
      } else {
        setError(result.payload?.error || 'Registration failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Register</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <RegisterForm onSubmit={handleSubmit} loading={loading} />
      </Box>
    </Container>
  );
};

export default Register;
