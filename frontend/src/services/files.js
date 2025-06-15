import api from './api';

export const getFiles = async () => {
  const response = await api.get('/api/files/');
  return response.data;
};

export const uploadFile = async (formData, onUploadProgress) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress
  };
  
  const response = await api.post('/api/files/', formData, config);
  return response;
};

export const deleteFile = async (id) => {
  await api.delete(`/api/files/${id}/`);
};

export const renameFile = async (id, newName) => {
  const response = await api.patch(`/api/files/${id}/rename/`, { new_name: newName });
  return response.data;
};

export const updateFileComment = async (id, comment) => {
  const response = await api.patch(`/api/files/${id}/update_comment/`, { comment });
  return response.data;
};

export const shareFile = async (id) => {
  const response = await api.post(`/api/files/${id}/share/`);
  return response.data;
};

export const downloadFile = async (id) => {
  const response = await api.get(`/api/files/${id}/download/`, {
    responseType: 'blob'
  });
  return response;
};

export const getPublicFile = async (sharedLink) => {
  const response = await api.get(`/api/public/files/${sharedLink}/`);
  return response.data;
};