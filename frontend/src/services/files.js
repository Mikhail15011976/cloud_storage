import api from './api';

export const getFiles = async () => {
  try {
    const response = await api.get('/files/');    
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении файлов:', error);
    throw error;
  }
};

export const uploadFile = async (formData, onUploadProgress) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    };
    const response = await api.post('/files/', formData, config);
    return response.data;
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    throw error;
  }
};

export const deleteFile = async (id) => {
  try {
    await api.delete(`/files/${id}/`);
  } catch (error) {
    console.error(`Ошибка при удалении файла с id=${id}:`, error);
    throw error;
  }
};

export const renameFile = async (id, newName) => {
  try {
    const response = await api.patch(`/files/${id}/rename/`, { new_name: newName });
    return response.data;
  } catch (error) {
    console.error(`Ошибка при переименовании файла с id=${id}:`, error);
    throw error;
  }
};

export const updateFileComment = async (id, comment) => {
  try {
    const response = await api.patch(`/files/${id}/update_comment/`, { comment });
    return response.data;
  } catch (error) {
    console.error(`Ошибка при обновлении комментария файла с id=${id}:`, error);
    throw error;
  }
};

export const shareFile = async (id) => {
  try {
    const response = await api.post(`/files/${id}/share/`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при шаринге файла с id=${id}:`, error);
    throw error;
  }
};

export const downloadFile = async (id) => {
  try {
    const response = await api.get(`/files/${id}/download/`, {
      responseType: 'blob',
    });
    return response;
  } catch (error) {
    console.error(`Ошибка при скачивании файла с id=${id}:`, error);
    throw error;
  }
};

export const getPublicFile = async (sharedLink) => {
  try {
    const response = await api.get(`/public/files/${sharedLink}/`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при получении публичного файла с ссылкой=${sharedLink}:`, error);
    throw error;
  }
};
