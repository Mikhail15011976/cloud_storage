import React, { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import { loadUserFromStorage, logoutUser } from './store/slices/authSlice';
import { loadFilesFromStorage } from './store/slices/filesSlice';
import Header from './components/layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import UserFiles from './pages/UserFiles';
import NotFound from './pages/NotFound';
import { CircularProgress, Box, Backdrop, Typography, Button } from '@mui/material';
import { SnackbarProvider } from 'notistack';

// Компонент для маршрутизации и загрузки данных приложения
const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  
  const isMountedRef = useRef(true);
  const initializationRef = useRef(false);
  const sessionCheckRef = useRef(null);

  // Функция проверки валидности сессии
  const checkSessionValidity = useCallback(() => {
    if (!isAuthenticated || !isMountedRef.current) return false;

    try {
      // Проверяем время последней активности (простая реализация)
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity);
        // Сессия истекает через 24 часа
        if (timeDiff > 24 * 60 * 60 * 1000) {
          dispatch(logoutUser());
          return false;
        }
      }
      
      // Обновляем время последней активности
      localStorage.setItem('lastActivity', Date.now().toString());
      return true;
    } catch (error) {
      console.error('Session check error:', error);
      return true; // В случае ошибки считаем сессию валидной
    }
  }, [dispatch, isAuthenticated]);

  // Функция инициализации приложения с защитой от утечек
  const initializeApp = useCallback(async () => {
    if (initializationRef.current || !isMountedRef.current) return;
    initializationRef.current = true;

    try {
      console.log('Initializing app...');
      
      // Загружаем пользователя из хранилища
      dispatch(loadUserFromStorage());
      
      // Даем время для загрузки состояния
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Проверяем валидность сессии
      if (isMountedRef.current && isAuthenticated) {
        const isValid = checkSessionValidity();
        
        if (isValid && isMountedRef.current) {
          // Загружаем файлы только если сессия валидна
          dispatch(loadFilesFromStorage());
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      if (isMountedRef.current) {
        initializationRef.current = false;
      }
    }
  }, [dispatch, isAuthenticated, checkSessionValidity]);

  // Эффект для инициализации приложения
  useEffect(() => {
    isMountedRef.current = true;

    initializeApp();

    // Функция очистки при размонтировании
    return () => {
      isMountedRef.current = false;
      initializationRef.current = false;
      
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
    };
  }, [initializeApp]);

  // Эффект для периодической проверки сессии
  useEffect(() => {
    if (!isAuthenticated || !isMountedRef.current) return;

    // Очищаем предыдущий интервал
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
    }

    // Устанавливаем новый интервал проверки (каждые 5 минут)
    sessionCheckRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkSessionValidity();
      }
    }, 5 * 60 * 1000);

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
    };
  }, [isAuthenticated, checkSessionValidity]);

  // Эффект для обновления времени активности при взаимодействии с приложением
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Обновляем активность при событиях пользователя
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated]);

  // Функция для защищенного роутинга
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isMountedRef.current) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (adminOnly && !user?.is_admin) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // Функция для публичных роутов (только для неаутентифицированных)
  const PublicRoute = ({ children }) => {
    if (!isMountedRef.current) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      );
    }

    if (isAuthenticated) {
      return <Navigate to={user?.is_admin ? "/admin" : "/dashboard"} replace />;
    }

    return children;
  };

  // Отображение загрузки
  if (loading) {
    return (
      <Backdrop
        open={true}
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper'
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          gap={3}
        >
          <CircularProgress size={80} thickness={4} />
          <Typography variant="h6" color="text.primary">
            Загрузка приложения...
          </Typography>
        </Box>
      </Backdrop>
    );
  }

  return (
    <>
      <Header />
      <Box component="main" sx={{ flexGrow: 1, minHeight: 'calc(100vh - 64px)' }}>
        <Routes>
          {/* Публичный маршрут */}
          <Route path="/" element={<Home />} />
          
          {/* Публичные маршруты (только для неаутентифицированных) */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Защищенные маршруты */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Маршруты только для администраторов */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/user/:userId/files" 
            element={
              <ProtectedRoute adminOnly={true}>
                <UserFiles />
              </ProtectedRoute>
            } 
          />
          
          {/* Маршрут для несуществующих страниц */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
    </>
  );
};

// Компонент обработки ошибок приложения
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={3}
          p={3}
        >
          <Typography variant="h4" color="error" align="center">
            Произошла ошибка в приложении
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            Пожалуйста, попробуйте перезагрузить страницу или вернуться на главную.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={this.handleReset}
            size="large"
          >
            Вернуться на главную
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Основной компонент приложения
const App = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SnackbarProvider 
          maxSnack={3} 
          autoHideDuration={5000}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          preventDuplicate
        >
          <Router>
            <AppContent />
          </Router>
        </SnackbarProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;