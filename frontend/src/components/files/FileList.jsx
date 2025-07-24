import React from 'react';
import { FileItem } from './FileItem';
import { List, Paper, Typography } from '@mui/material';

export const FileList = ({ files, onDelete, onDownload, onShare, onRename, onCommentUpdate, onView }) => {
  if (!Array.isArray(files)) {
    return <Typography>Загрузка файлов...</Typography>;
  }

  if (files.length === 0) {
    return <Typography>Нет файлов для отображения</Typography>;
  }

  return (
    <Paper elevation={3}>
      <List>
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onDelete={onDelete}
            onDownload={onDownload}
            onShare={onShare}
            onRename={onRename}
            onCommentUpdate={onCommentUpdate}
            onView={onView}
          />
        ))}
      </List>
    </Paper>
  );
};
