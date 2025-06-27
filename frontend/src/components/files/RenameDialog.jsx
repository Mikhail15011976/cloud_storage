import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import api from '../../services/api';

export const RenameDialog = ({ open, onClose, file, onRename }) => {
  const [newName, setNewName] = useState(file?.original_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!newName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    
    try {
      setLoading(true);
      await api.patch(`/files/${file.id}/rename/`, { new_name: newName });
      onRename(file.id, newName);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rename file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Rename File</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New file name"
          type="text"
          fullWidth
          variant="standard"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Renaming...' : 'Rename'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
