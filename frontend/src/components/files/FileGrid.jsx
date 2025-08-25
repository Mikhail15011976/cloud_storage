import React from 'react';
import { Grid, Paper, Typography, Tooltip } from '@mui/material';
import { InsertDriveFile, Image, PictureAsPdf, Description } from '@mui/icons-material';

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'IMAGE':
      return <Image color="primary" sx={{ fontSize: 60 }} />;
    case 'PDF':
      return <PictureAsPdf color="error" sx={{ fontSize: 60 }} />;
    case 'WORD':
      return <Description color="info" sx={{ fontSize: 60 }} />;
    default:
      return <InsertDriveFile color="secondary" sx={{ fontSize: 60 }} />;
  }
};

const getFileTypeLabel = (fileType) => {
  switch (fileType) {
    case 'IMAGE':
      return 'Изображение';
    case 'PDF':
      return 'PDF документ';
    case 'WORD':
      return 'Word документ';
    case 'TEXT':
      return 'Текстовый файл';
    default:
      return 'Другое';
  }
};

export const FileGrid = ({ files, onFileClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'N/A';
    }
  };

  return (
    <Grid container spacing={3} sx={{ padding: 2 }}>
      {files && files.length > 0 ? (
        files.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.id || 'unknown-id'}>
            <Tooltip title={getFileTypeLabel(file.file_type || 'OTHER')} arrow>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  minHeight: 150,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => onFileClick(file)}
              >
                {getFileIcon(file.file_type || 'OTHER')}
                <Typography
                  variant="subtitle2"
                  sx={{
                    mt: 1,
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {file.original_name || 'Без имени'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {file.human_readable_size || '0 B'} | {formatDate(file.upload_date)}
                </Typography>
                {file.comment && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {file.comment.length > 30 ? `${file.comment.substring(0, 30)}...` : file.comment}
                  </Typography>
                )}
                {file.last_download && (
                  <Typography variant="caption" color="text.secondary">
                    Скачан: {formatDate(file.last_download)}
                  </Typography>
                )}
              </Paper>
            </Tooltip>
          </Grid>
        ))
      ) : (
        <Grid item xs={12}>
          <Typography variant="body1" color="text.secondary" align="center">
            Файлы не найдены.
          </Typography>
        </Grid>
      )}
    </Grid>
  );
};
