import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button 
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

export const RenameDialog = ({ open, onClose, file, onRename }) => {
  const [newName, setNewName] = useState(file?.original_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (!newName.trim()) {
      setError('Имя файла не может быть пустым');
      enqueueSnackbar('Имя файла не может быть пустым', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log("File ID:", file.id);
      console.log("Rename request URL:", `/files/${file.id}/rename/`);
      console.log("Rename request body:", { new_name: newName });
      await api.patch(`/files/${file.id}/rename/`, { new_name: newName });
      onRename(file.id, newName);
      enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
      console.log("Calling onClose to close the dialog"); 
      onClose(); 
    } catch (err) {
      console.error("Error renaming file:", err);
      const errorMessage = err.response?.data?.detail || 'Ошибка при переименовании файла';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Переименовать файл</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Новое имя файла"
          type="text"
          fullWidth
          variant="standard"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained" 
          disabled={loading || !newName.trim()}
        >
          {loading ? 'Переименование...' : 'Переименовать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
