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
  
  const handleGetShareLink = () => {
    onShare(file.id);
    handleMenuClose();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const getFileTypeLabel = (fileType) => {
    const fileTypeLabels = {
      'PDF': 'PDF Документ',
      'WORD': 'Word Документ',
      'IMAGE': 'Изображение',
      'TEXT': 'Текстовый файл',
      'OTHER': 'Другое'
    };
    return fileTypeLabels[fileType] || 'Неизвестный тип';
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
              <MenuItem onClick={handleGetShareLink}>
                <Share sx={{ mr: 1 }} /> Получить ссылку
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
              <span>Тип: {getFileTypeLabel(file.file_type)}</span>
              <br />
              <span>Размер: {file.human_readable_size}</span>
              <br />
              <span>Загружен: {formatDate(file.upload_date)}</span>
              <br />
              <span>Последнее скачивание: {formatDate(file.last_download)}</span>
              {file.comment && (
                <>
                  <br />
                  <span>Комментарий: {file.comment}</span>
                </>
              )}
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
