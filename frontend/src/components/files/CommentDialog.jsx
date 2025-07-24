import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, CircularProgress } from '@mui/material';
import api from '../../services/api';

export const CommentDialog = ({ open, onClose, file, onCommentUpdate }) => {  
  const [comment, setComment] = useState(file?.comment || '');  
  const [loading, setLoading] = useState(false);  
  const [error, setError] = useState('');  
  const [successMessage, setSuccessMessage] = useState('');
  
  const handleSubmit = async () => {    
    setError('');
    setSuccessMessage('');
    
    if (!comment.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    try {
      setLoading(true);      
      const response = await api.patch(`/files/${file.id}/`, { comment });      
      
      if (response.status === 200) {        
        onCommentUpdate(file.id, comment);        
        setSuccessMessage('Комментарий успешно обновлен');        
        onClose();
      } else {
        setError('Неожиданный ответ от сервера');
      }
    } catch (err) {      
      const errorMessage = err.response?.data?.detail || err.response?.data?.comment?.[0] || 'Не удалось обновить комментарий';
      setError(errorMessage);
    } finally {      
      setLoading(false);
    }
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Обновить комментарий к файлу</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Комментарий к файлу"
          type="text"
          fullWidth
          variant="outlined" 
          multiline
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyPress={handleKeyPress} 
          error={!!error}
          helperText={error || successMessage} 
          disabled={loading} 
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !comment.trim()} 
          variant="contained" 
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : null} 
        >
          {loading ? 'Обновление...' : 'Обновить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
