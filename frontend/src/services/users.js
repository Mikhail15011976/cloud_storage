import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.patch(`/users/${userId}/`, userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}/`);
  return response.data;
};

export const getUserFiles = async (userId) => {
  const response = await api.get(`/files/?owner=${userId}`);
  return response.data;
};
