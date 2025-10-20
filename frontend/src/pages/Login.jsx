import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import LoginForm from '../components/auth/LoginForm';
import { Container, Box, Typography, Alert, CircularProgress } from '@mui/material';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(state => state.auth);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (credentials) => {
    setLocalError('');
    
    try {
      const result = await dispatch(login(credentials));
      
      if (result.payload?.success) {        
        if (result.payload.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setLocalError(result.payload?.error || 'Login failed');
      }
    } catch (err) {
      setLocalError('An unexpected error occurred');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center">
          Login
        </Typography>
        
        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || localError}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <LoginForm onSubmit={handleSubmit} loading={loading} />
        )}
      </Box>
    </Container>
  );
};

export default Login;