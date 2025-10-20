import axios from 'axios';
import { store } from '../store/store';
import { logoutUser } from '../store/slices/authSlice';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

const getToken = () => {
  return localStorage.getItem('token');
};

api.interceptors.request.use((config) => {
  const token = getToken();
  
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }  
  
  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken.split('=')[1];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {      
      store.dispatch(logoutUser());
    }
    return Promise.reject(error);
  }
);

export default api;