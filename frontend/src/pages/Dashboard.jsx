import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Stack,
  Pagination,
  Alert,
  Snackbar,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import UploadIcon from '@mui/icons-material/Upload';
import { FileList, UploadButton } from '../components/files';
import { RenameDialog } from '../components/files/RenameDialog';
import { CommentDialog } from '../components/files/CommentDialog';
import api from '../services/api';

const Dashboard = () => {
  console.log('Dashboard rendered');

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [renameDialog, setRenameDialog] = useState({ open: false, file: null });
  const [commentDialog, setCommentDialog] = useState({ open: false, file: null });
  const [shareLoading, setShareLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});

  const { enqueueSnackbar } = useSnackbar();

  // Стабильная функция загрузки файлов с использованием useCallback
  const fetchFiles = useCallback(async (signal) => {
    console.log('Fetching files...');
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/files/', {
        params: {
          page: pagination.page,
          page_size: pagination.pageSize,
        },
        signal,
      });
      
      console.log('Received files:', response.data);

      // Проверяем, не был ли запрос отменен
      if (!signal.aborted) {
        const filesData = response.data.results || response.data || [];
        const totalCount = response.data.count || filesData.length;
        
        setFiles(filesData);
        setPagination(prev => ({
          ...prev,
          totalCount,
          totalPages: Math.ceil(totalCount / prev.pageSize),
        }));
      }
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        console.log('Fetch cancelled');
        return;
      }
      
      console.error('Error fetching files:', error);
      
      if (!signal.aborted) {
        const errorMessage = error.response?.data?.detail || 'Ошибка при загрузке файлов';
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [pagination.page, pagination.pageSize, enqueueSnackbar]);

  // useEffect с правильной очисткой
  useEffect(() => {
    const controller = new AbortController();
    
    fetchFiles(controller.signal);
    
    // Функция очистки при размонтировании компонента
    return () => {
      controller.abort();
    };
  }, [fetchFiles]);

  const handlePageChange = (event, newPage) => {
    console.log('Page changed:', newPage);
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleDelete = async (id) => {
    console.log('Deleting file:', id);
    
    setDeleteLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await api.delete(`/files/${id}/`);
      
      // Оптимистичное обновление UI
      setFiles(prev => prev.filter(file => file.id !== id));
      setPagination(prev => ({
        ...prev,
        totalCount: Math.max(prev.totalCount - 1, 0),
        totalPages: Math.max(Math.ceil((Math.max(prev.totalCount - 1, 0)) / prev.pageSize), 1),
      }));
      
      enqueueSnackbar('Файл успешно удален', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting file:', error);
      
      // Откатываем оптимистичное обновление в случае ошибки
      const controller = new AbortController();
      fetchFiles(controller.signal);
      
      const errorMessage = error.response?.data?.detail || 'Ошибка при удалении файла';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setDeleteLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDownload = async (id) => {
    console.log('Downloading file:', id);
    
    let blobUrl = null;
    
    try {
      const response = await api.get(`/files/${id}/download/`, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `file_${id}`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1];
        }
      } else {
        const file = files.find(f => f.id === id);
        if (file && file.original_name) {
          fileName = file.original_name;
        }
      }

      const contentType = response.headers['content-type'];
      blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { 
          type: contentType || 'application/octet-stream' 
        })
      );
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Обновляем дату последнего скачивания
      setFiles(prev => prev.map(file => 
        file.id === id ? { ...file, last_download: new Date().toISOString() } : file
      ));

      enqueueSnackbar(`Файл "${fileName}" успешно скачан`, { variant: 'success' });
    } catch (error) {
      console.error('Error downloading file:', error);
      enqueueSnackbar('Ошибка при скачивании файла', { variant: 'error' });
    } finally {
      // Всегда освобождаем URL объекта для предотвращения утечек памяти
      if (blobUrl) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    }
  };

  // Функция для копирования в буфер обмена с обработкой ошибок
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  };

  const handleShare = async (id) => {
    console.log('Sharing file:', id);
    
    setShareLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      const response = await api.post(`/files/${id}/share/`);
      const sharedLink = response.data.shared_link;

      const success = await copyToClipboard(sharedLink);
      
      if (success) {
        enqueueSnackbar('Ссылка для общего доступа скопирована в буфер обмена', { 
          variant: 'success' 
        });
      } else {
        enqueueSnackbar(`Скопируйте ссылку вручную: ${sharedLink}`, { 
          variant: 'info',
          autoHideDuration: 10000 
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при создании ссылки для общего доступа';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setShareLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRenameOpen = (file) => {
    setRenameDialog({ open: true, file });
  };

  const handleRenameClose = () => {
    setRenameDialog({ open: false, file: null });
  };

  const handleRenameSave = async (id, newName) => {
    try {
      await api.patch(`/files/${id}/rename/`, { new_name: newName });
      
      setFiles(prev => prev.map(file => 
        file.id === id ? { ...file, original_name: newName } : file
      ));
      
      enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
      handleRenameClose();
    } catch (error) {
      console.error('Error renaming file:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при переименовании файла';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleCommentOpen = (file) => {
    setCommentDialog({ open: true, file });
  };

  const handleCommentClose = () => {
    setCommentDialog({ open: false, file: null });
  };

  const handleCommentSave = async (id, newComment) => {
    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      
      setFiles(prev => prev.map(file => 
        file.id === id ? { ...file, comment: newComment } : file
      ));
      
      enqueueSnackbar('Комментарий обновлен', { variant: 'success' });
      handleCommentClose();
    } catch (error) {
      console.error('Error updating comment:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при обновлении комментария';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleView = (id) => {
    console.log('Viewing file:', id);
    try {
      const file = files.find(f => f.id === id);
      if (file) {
        window.open(`/files/${id}/download/`, '_blank');
        enqueueSnackbar('Файл открыт для просмотра', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      enqueueSnackbar('Ошибка при открытии файла для просмотра', { variant: 'error' });
    }
  };

  const handleUploadSuccess = () => {
    console.log('File upload successful, refreshing list...');
    
    // Сбрасываем на первую страницу и обновляем список
    setPagination(prev => ({ ...prev, page: 1 }));
    
    const controller = new AbortController();
    fetchFiles(controller.signal);
    
    return () => controller.abort();
  };

  // Функция для повторной загрузки файлов
  const handleRetry = () => {
    const controller = new AbortController();
    fetchFiles(controller.signal);
    
    return () => controller.abort();
  };

  // Отображение загрузки
  if (loading && files.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <UploadButton 
              onSuccess={handleUploadSuccess}
              startIcon={<UploadIcon />}
              sx={{ 
                width: '100%',
                py: 1.5,
                fontWeight: 'bold',
              }}
            />
            
            {/* Статистика */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Статистика
              </Typography>
              <Typography variant="body2">
                Всего файлов: {pagination.totalCount}
              </Typography>
              <Typography variant="body2">
                Страница: {pagination.page} из {pagination.totalPages}
              </Typography>
            </Box>
          </Stack>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Мои файлы
            </Typography>
            
            {error && (
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={handleRetry}>
                    Повторить
                  </Button>
                }
              >
                {error}
              </Alert>
            )}
          </Box>
          
          {files.length === 0 && !loading ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                Файлы не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Загрузите ваш первый файл с помощью кнопки выше
              </Typography>
            </Box>
          ) : (
            <>
              <FileList 
                files={files}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onShare={handleShare}
                onRename={handleRenameOpen}
                onCommentUpdate={handleCommentOpen}
                onView={handleView}
                shareLoading={shareLoading}
                deleteLoading={deleteLoading}
              />
              
              {pagination.totalPages > 1 && (
                <Box mt={4} display="flex" justifyContent="center">
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>

      {/* Диалог переименования */}
      <RenameDialog
        open={renameDialog.open}
        onClose={handleRenameClose}
        file={renameDialog.file}
        onRename={handleRenameSave}
      />

      {/* Диалог комментария */}
      <CommentDialog
        open={commentDialog.open}
        onClose={handleCommentClose}
        file={commentDialog.file}
        onCommentUpdate={handleCommentSave}
      />

      {/* Снекбар для уведомлений */}
      <Snackbar />
    </Container>
  );
};

// Компонент Button для исправления ошибки в коде
const Button = ({ color = 'inherit', size = 'small', onClick, children, ...props }) => {
  return (
    <button 
      style={{ 
        color, 
        fontSize: size === 'small' ? '14px' : '16px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: '4px 8px'
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Dashboard;