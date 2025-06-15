// frontend/src/components/files/CommentDialog.jsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import api from '../../services/api';

export const CommentDialog = ({ open, onClose, file, onCommentUpdate }) => {
  const [comment, setComment] = useState(file?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await api.patch(`/files/${file.id}/update_comment/`, { comment });
      onCommentUpdate(file.id, comment);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Update File Comment</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="File comment"
          type="text"
          fullWidth
          variant="standard"
          multiline
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};