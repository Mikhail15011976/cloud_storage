import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button,
  CircularProgress,
  Box
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

export const RenameDialog = ({ open, onClose, file, onRename }) => {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  
  useEffect(() => {
    if (open && file) {      
      const fileNameWithoutExt = file.original_name ? 
        file.original_name.replace(/\.[^/.]+$/, "") : '';
      setNewName(fileNameWithoutExt);
      setError('');
      setLoading(false);
    }
  }, [open, file]);
  
  const handleSubmit = useCallback(async () => {
    if (!file || !file.id) {
      setError('Файл не выбран');
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError('Имя файла не может быть пустым');
      return;
    }
    
    const originalFileName = file.original_name || '';
    const fileExtension = originalFileName.includes('.') ? 
      originalFileName.substring(originalFileName.lastIndexOf('.')) : '';
    
    const fullFileName = trimmedName + fileExtension;
    
    if (fullFileName === file.original_name) {
      onClose();
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    try {
      console.log("File ID:", file.id);
      console.log("Rename request URL:", `/files/${file.id}/rename/`);
      console.log("Rename request body:", { new_name: fullFileName });

      await api.patch(`/files/${file.id}/rename/`, { 
        new_name: fullFileName 
      });

      if (isMounted) {
        onRename(file.id, fullFileName);
        enqueueSnackbar('Файл успешно переименован', { 
          variant: 'success',
          autoHideDuration: 3000 
        });
        onClose();
      }
    } catch (err) {
      if (isMounted) {
        console.error("Error renaming file:", err);
        const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.new_name?.[0] || 
                           'Ошибка при переименовании файла';
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 5000 
        });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [file, newName, onRename, onClose, enqueueSnackbar]);
  
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!loading && newName.trim()) {
        handleSubmit();
      }
    }
    
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!loading) {
        onClose();
      }
    }
  }, [loading, newName, handleSubmit, onClose]);
  
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyPress);
      
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [open, handleKeyPress]);
  
  const validateFileName = (name) => {
    const trimmed = name.trim();
    
    if (!trimmed) {
      return 'Имя файла не может быть пустым';
    }
    
    if (trimmed.length > 255) {
      return 'Имя файла слишком длинное (макс. 255 символов)';
    }    
    
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmed)) {
      return 'Имя файла содержит запрещенные символы';
    }
    
    return '';
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setNewName(value);
        
    if (value.trim()) {
      const validationError = validateFileName(value);
      setError(validationError);
    } else {
      setError('');
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };
  
  if (!file) {
    return null;
  }
  
  const originalFileName = file.original_name || '';
  const fileExtension = originalFileName.includes('.') ? 
    originalFileName.substring(originalFileName.lastIndexOf('.')) : '';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        Переименовать файл
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ mb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Новое имя файла"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={handleNameChange}
            error={!!error}
            helperText={error || ' '} 
            disabled={loading}
            inputProps={{
              maxLength: 255,
              'aria-describedby': 'fileNameHelp'
            }}
          />
        </Box>
        
        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
          <div>Текущее имя: {file.original_name}</div>
          <div>Расширение файла: {fileExtension || 'нет'}</div>
          <div>Полное имя после переименования: {newName.trim()}{fileExtension}</div>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose} 
          color="secondary" 
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          Отмена
        </Button>
        
        <Button 
          type="submit"
          color="primary" 
          variant="contained" 
          disabled={loading || !newName.trim() || !!error}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          sx={{ minWidth: 140 }}
        >
          {loading ? 'Переименование...' : 'Переименовать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameDialog;