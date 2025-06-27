import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, LinearProgress } from '@mui/material';
import { uploadFile } from '../../services/files';
import { addFile } from '../../store/slices/filesSlice';

export const UploadButton = ({ onSuccess }) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const dispatch = useDispatch();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFile(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      });

      dispatch(addFile(response.data));
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ width: '100%', margin: '10px 0 20px 0', padding: '0 10px' }}>
      <input
        accept="*/*"
        style={{ display: 'none' }}
        id="contained-button-file"
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <label htmlFor="contained-button-file">
        <Button 
          variant="contained" 
          component="span"
          disabled={uploading}
          fullWidth
        >
          {uploading ? 'Загрузка...' : 'Загрузить'}
        </Button>
      </label>
      {uploading && (
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          style={{ marginTop: '10px' }}
        />
      )}
    </div>
  );
};
