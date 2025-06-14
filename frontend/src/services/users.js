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
  await api.delete(`/users/${userId}/`);
};