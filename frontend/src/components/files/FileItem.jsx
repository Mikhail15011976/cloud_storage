import React from 'react';
import { ListItem, ListItemText, IconButton } from '@mui/material';
import { Delete, Download, Share } from '@mui/icons-material';

export const FileItem = ({ file, onDelete, onDownload, onShare }) => {
  return (
    <ListItem
      secondaryAction={
        <>
          <IconButton edge="end" onClick={() => onShare(file.id)}>
            <Share />
          </IconButton>
          <IconButton edge="end" onClick={() => onDownload(file.id)}>
            <Download />
          </IconButton>
          <IconButton edge="end" onClick={() => onDelete(file.id)}>
            <Delete />
          </IconButton>
        </>
      }
    >
      <ListItemText
        primary={file.original_name}
        secondary={`${file.size} bytes - ${file.upload_date}`}
      />
    </ListItem>
  );
};