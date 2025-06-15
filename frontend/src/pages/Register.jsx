import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { register } from '../store/slices/authSlice';
import RegisterForm from '../components/auth/RegisterForm';
import { Container, Box, Typography } from '@mui/material';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (userData) => {
    const result = await dispatch(register(userData));
    if (result.payload?.success) {
      navigate('/dashboard');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Register</Typography>
        <RegisterForm onSubmit={handleSubmit} />
      </Box>
    </Container>
  );
};

export default Register;