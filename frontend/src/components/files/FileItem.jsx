import React, { useState } from 'react';
import { ListItem, ListItemText, IconButton, Menu, MenuItem } from '@mui/material';
import { Delete, Download, Share, MoreVert, Edit, Comment } from '@mui/icons-material';
import { RenameDialog } from './RenameDialog';
import { CommentDialog } from './CommentDialog';

export const FileItem = ({ file, onDelete, onDownload, onShare, onRename, onCommentUpdate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleRename = (id, newName) => {
    onRename(id, newName);
  };
  
  const handleCommentUpdate = (id, newComment) => {
    onCommentUpdate(id, newComment);
  };

  return (
    <>
      <ListItem
        secondaryAction={
          <>
            <IconButton edge="end" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { setRenameOpen(true); handleMenuClose(); }}>
                <Edit sx={{ mr: 1 }} /> Rename
              </MenuItem>
              <MenuItem onClick={() => { setCommentOpen(true); handleMenuClose(); }}>
                <Comment sx={{ mr: 1 }} /> Edit Comment
              </MenuItem>
              <MenuItem onClick={() => { onShare(file.id); handleMenuClose(); }}>
                <Share sx={{ mr: 1 }} /> Share
              </MenuItem>
              <MenuItem onClick={() => { onDownload(file.id); handleMenuClose(); }}>
                <Download sx={{ mr: 1 }} /> Download
              </MenuItem>
              <MenuItem onClick={() => { onDelete(file.id); handleMenuClose(); }}>
                <Delete sx={{ mr: 1 }} /> Delete
              </MenuItem>
            </Menu>
          </>
        }
      >
        <ListItemText
          primary={file.original_name}
          secondary={
            <>
              <div>{file.size} bytes</div>
              <div>Uploaded: {new Date(file.upload_date).toLocaleString()}</div>
              {file.comment && <div>Comment: {file.comment}</div>}
            </>
          }
        />
      </ListItem>
      
      <RenameDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        file={file}
        onRename={handleRename}
      />
      
      <CommentDialog
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        file={file}
        onCommentUpdate={handleCommentUpdate}
      />
    </>
  );
};