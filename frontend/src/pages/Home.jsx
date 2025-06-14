import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <Container maxWidth="md">
      <Box textAlign="center" mt={5}>
        <Typography variant="h3" gutterBottom>
          Welcome to My Cloud Storage
        </Typography>
        <Typography variant="subtitle1" paragraph>
          Store, manage and share your files securely in the cloud
        </Typography>
        <Box mt={4}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            to="/login"
            sx={{ mr: 2 }}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            component={Link}
            to="/register"
          >
            Register
          </Button>
        </Box>
      </Box>
    </Container>
  );
};