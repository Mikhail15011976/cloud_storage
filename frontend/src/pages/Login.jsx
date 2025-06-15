import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import LoginForm from '../components/auth/LoginForm';
import { Container, Box, Typography } from '@mui/material';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (result.payload?.success) {
      navigate('/dashboard');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Login</Typography>
        <LoginForm onSubmit={handleSubmit} />
      </Box>
    </Container>
  );
};

export default Login;