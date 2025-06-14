import api from './api';

export const getFiles = async () => {
  const response = await api.get('/files/');
  return response.data;
};

export const uploadFile = async (formData, onUploadProgress) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress
  };
  
  const response = await api.post('/files/', formData, config);
  return response;
};

export const deleteFile = async (id) => {
  await api.delete(`/files/${id}/`);
};