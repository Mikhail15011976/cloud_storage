import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import LoginForm from '../components/auth/LoginForm';
import { Container, Box, Typography } from '@mui/material';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const handleSubmit = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (result.payload?.success) {      
      navigate(user?.is_admin ? '/admin' : '/dashboard');
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
