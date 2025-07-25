import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import { loadUserFromStorage } from './store/slices/authSlice';
import { loadFilesFromStorage } from './store/slices/filesSlice';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import UserFiles from './pages/UserFiles';
import { CircularProgress, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';

// Компонент для маршрутизации и загрузки данных приложения
const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  
  useEffect(() => {    
    dispatch(loadUserFromStorage());
    if (isAuthenticated) {      
      dispatch(loadFilesFromStorage());
    }
  }, [dispatch, isAuthenticated]);  
  
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={80} />
      </Box>
    );
  }
  
  return (
    <>
      <Header />
      <Routes>        
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to={user?.is_admin ? "/admin" : "/dashboard"} />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
        />
        
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        
        <Route
          path="/admin"
          element={
            isAuthenticated && user?.is_admin ? <Admin /> : <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
          }
        />
        <Route
          path="/admin/user/:userId/files"
          element={
            isAuthenticated && user?.is_admin ? (
              <UserFiles />
            ) : (
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
            )
          }
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

// Основной компонент приложения с Redux, маршрутизацией и SnackbarProvider
const App = () => {
  return (
    <Provider store={store}>
      <SnackbarProvider maxSnack={3} autoHideDuration={5000}>
        <Router>
          <AppContent />
        </Router>
      </SnackbarProvider>
    </Provider>
  );
};

export default App;
