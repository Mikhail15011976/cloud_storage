import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/slices/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  const handleRegisterClick = () => {
    if (isAuthenticated) {      
      dispatch(logoutUser()).then(() => {
        navigate('/register');
      });
    } else {
      navigate('/register');
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Button color="inherit" component={Link} to="/">
            My Cloud Storage
          </Button>
        </Typography>
        
        {isAuthenticated ? (
          <>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user?.username}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
            <Button color="inherit" onClick={handleRegisterClick}>
              Register
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
