import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Typography } from '@mui/material';
import { uploadFile } from '../../services/files';
import { addFile } from '../../store/slices/filesSlice';

export const UploadButton = ({ onSuccess }) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState('');
  const dispatch = useDispatch();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setDialogOpen(true); 
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFile(null);
    setComment('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setDialogOpen(false); 

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('original_name', selectedFile.name);
      if (comment.trim()) {
        formData.append('comment', comment); 
      }

      const response = await uploadFile(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      });

      dispatch(addFile(response));
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setProgress(0);
      setSelectedFile(null);
      setComment('');
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

      {/* Диалоговое окно для ввода комментария */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Добавить комментарий к файлу</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Файл: {selectedFile?.name}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Комментарий (необязательно)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={uploading}>
            Отмена
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            variant="contained"
            color="primary"
            startIcon={uploading ? <CircularProgress size={20} /> : null}
          >
            {uploading ? 'Загрузка...' : 'Загрузить'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
