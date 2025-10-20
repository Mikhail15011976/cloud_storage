import { createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    loadUserFromStorage(state) {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      if (token && user) {
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
      }
    }
  }
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout,
  loadUserFromStorage
} = authSlice.actions;

export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(loginStart());    
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const response = await api.post('/auth/login/', credentials);
    const { user, token } = response.data;
    
    if (token && user) {      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));      
      
      dispatch(loginSuccess({ user, token }));      
      
      return { 
        success: true, 
        user,
        isAdmin: user.is_admin 
      };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    const message = error.response?.data?.detail || 
                   error.response?.data?.non_field_errors?.[0] || 
                   'Login failed';
    
    dispatch(loginFailure(message));
    return { success: false, error: message };
  }
};

export const register = (userData) => async (dispatch) => {
  try {
    dispatch(loginStart());
    const response = await api.post('/auth/register/', userData);    
    
    const { user, token } = response.data;
    
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch(loginSuccess({ user, token }));
      return { success: true };
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    let message = 'Registration failed';
    if (error.response && error.response.data) {      
      const errors = error.response.data;
      if (errors.username) {
        message = errors.username[0];
      } else if (errors.email) {
        message = errors.email[0];
      } else if (errors.detail) {
        message = errors.detail;
      } else {
        message = Object.values(errors).flat().join(' ') || message;
      }
    } else if (error.message) {
      message = error.message;
    }
    
    dispatch(loginFailure(message));
    return { success: false, error: message };
  }
};

export const logoutUser = () => async (dispatch) => {
  try {
    await api.post('/auth/logout/');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(logout());
  }
};

export default authSlice.reducer;
