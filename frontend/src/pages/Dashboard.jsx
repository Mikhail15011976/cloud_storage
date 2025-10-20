import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Stack,
  Pagination,
  Alert,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import UploadIcon from '@mui/icons-material/Upload';
import { FileList, UploadButton } from '../components/files';
import { RenameDialog } from '../components/files/RenameDialog';
import { CommentDialog } from '../components/files/CommentDialog';
import api from '../services/api';

const Dashboard = () => {
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
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  const fetchFiles = useCallback(async (signal) => {
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
      
      if (!signal.aborted && isMountedRef.current) {
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
      if (error.name === 'CanceledError' || error.name === 'AbortError' || !isMountedRef.current) {
        return;
      }
      
      const errorMessage = error.response?.data?.detail || 'Ошибка при загрузке файлов';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      if (!signal.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [pagination.page, pagination.pageSize, enqueueSnackbar]);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    fetchFiles(abortControllerRef.current.signal);    
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFiles]);

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleDelete = async (id) => {
    if (!isMountedRef.current) return;
    
    setDeleteLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      await api.delete(`/files/${id}/`);      
      
      if (isMountedRef.current) {
        setFiles(prev => prev.filter(file => file.id !== id));
        setPagination(prev => ({
          ...prev,
          totalCount: Math.max(prev.totalCount - 1, 0),
          totalPages: Math.max(Math.ceil((Math.max(prev.totalCount - 1, 0)) / prev.pageSize), 1),
        }));
        
        enqueueSnackbar('Файл успешно удален', { variant: 'success' });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchFiles(abortControllerRef.current.signal);
      
      const errorMessage = error.response?.data?.detail || 'Ошибка при удалении файла';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      if (isMountedRef.current) {
        setDeleteLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleDownload = async (id) => {
    if (!isMountedRef.current) return;
    
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
      
      if (isMountedRef.current) {
        setFiles(prev => prev.map(file => 
          file.id === id ? { ...file, last_download: new Date().toISOString() } : file
        ));

        enqueueSnackbar(`Файл "${fileName}" успешно скачан`, { variant: 'success' });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      enqueueSnackbar('Ошибка при скачивании файла', { variant: 'error' });
    } finally {      
      if (blobUrl) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    }
  };
  
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {        
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
      return false;
    }
  };

  const handleShare = async (id) => {
    if (!isMountedRef.current) return;
    
    setShareLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      const response = await api.post(`/files/${id}/share/`);
      const sharedLink = response.data.shared_link;

      const success = await copyToClipboard(sharedLink);
      
      if (isMountedRef.current) {
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
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      const errorMessage = error.response?.data?.detail || 'Ошибка при создании ссылки для общего доступа';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      if (isMountedRef.current) {
        setShareLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleRenameOpen = (file) => {
    setRenameDialog({ open: true, file });
  };

  const handleRenameClose = () => {
    setRenameDialog({ open: false, file: null });
  };

  const handleRenameSave = async (id, newName) => {
    if (!isMountedRef.current) return;
    
    try {
      await api.patch(`/files/${id}/rename/`, { new_name: newName });
      
      if (isMountedRef.current) {
        setFiles(prev => prev.map(file => 
          file.id === id ? { ...file, original_name: newName } : file
        ));
        
        enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
        handleRenameClose();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
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
    if (!isMountedRef.current) return;
    
    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      
      if (isMountedRef.current) {
        setFiles(prev => prev.map(file => 
          file.id === id ? { ...file, comment: newComment } : file
        ));
        
        enqueueSnackbar('Комментарий обновлен', { variant: 'success' });
        handleCommentClose();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      const errorMessage = error.response?.data?.detail || 'Ошибка при обновлении комментария';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleUploadSuccess = () => {
    if (!isMountedRef.current) return;
    
    setPagination(prev => ({ ...prev, page: 1 }));
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    fetchFiles(abortControllerRef.current.signal);
  };
  
  const handleRetry = () => {
    if (!isMountedRef.current) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    fetchFiles(abortControllerRef.current.signal);
  };
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
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

      <RenameDialog
        open={renameDialog.open}
        onClose={handleRenameClose}
        file={renameDialog.file}
        onRename={handleRenameSave}
      />

      <CommentDialog
        open={commentDialog.open}
        onClose={handleCommentClose}
        file={commentDialog.file}
        onCommentUpdate={handleCommentSave}
      />
    </Container>
  );
};

const Button = React.memo(({ color = 'inherit', size = 'small', onClick, children, ...props }) => {
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
});

export default React.memo(Dashboard);