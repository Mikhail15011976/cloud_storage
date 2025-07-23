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
    setRenameOpen(false);
  };
  
  const handleCommentUpdate = (id, newComment) => {
    onCommentUpdate(id, newComment);
    setCommentOpen(false);
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
                <Edit sx={{ mr: 1 }} /> Переименовать
              </MenuItem>
              <MenuItem onClick={() => { setCommentOpen(true); handleMenuClose(); }}>
                <Comment sx={{ mr: 1 }} /> Комментарий
              </MenuItem>
              <MenuItem onClick={() => { onShare(file.id); handleMenuClose(); }}>
                <Share sx={{ mr: 1 }} /> Поделиться
              </MenuItem>
              <MenuItem onClick={() => { onDownload(file.id); handleMenuClose(); }}>
                <Download sx={{ mr: 1 }} /> Скачать
              </MenuItem>
              <MenuItem onClick={() => { onDelete(file.id); handleMenuClose(); }}>
                <Delete sx={{ mr: 1 }} /> Удалить
              </MenuItem>
            </Menu>
          </>
        }
      >
        <ListItemText
          primary={file.original_name}
          secondary={
            <>
              <span>Размер: {file.human_readable_size}</span>
              <br />
              <span>Загружен: {new Date(file.upload_date).toLocaleString()}</span>
              {file.comment && <><br /><span>Комментарий: {file.comment}</span></>}
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
