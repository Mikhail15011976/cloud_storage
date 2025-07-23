import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { InsertDriveFile, Image, PictureAsPdf, Description } from '@mui/icons-material';

const getFileIcon = (fileType) => {
  switch(fileType) {
    case 'IMAGE':
      return <Image color="primary" sx={{ fontSize: 60 }} />;
    case 'PDF':
      return <PictureAsPdf color="error" sx={{ fontSize: 60 }} />;
    case 'WORD':
      return <Description color="info" sx={{ fontSize: 60 }} />;
    default:
      return <InsertDriveFile sx={{ fontSize: 60 }} />;
  }
};

export const FileGrid = ({ files, onFileClick, onDownload, onDelete, onShare, onRename, onCommentUpdate }) => {
  return (
    <Grid container spacing={3} sx={{ padding: 2 }}>
      {files.map((file) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => onFileClick(file)}
          >
            {getFileIcon(file.file_type)}
            <Typography 
              variant="subtitle2" 
              sx={{ 
                mt: 1, 
                textAlign: 'center',
                wordBreak: 'break-word'
              }}
            >
              {file.original_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {file.human_readable_size}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
