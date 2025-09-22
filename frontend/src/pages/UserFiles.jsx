import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Stack,
  Button,
  Pagination,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FileList, UploadButton } from '../components/files';
import { RenameDialog } from '../components/files/RenameDialog';
import { CommentDialog } from '../components/files/CommentDialog';
import api from '../services/api';

export default function UserFiles() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useSelector(state => state.auth);

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
  const [targetUser, setTargetUser] = useState(null);
  const [operationLoading, setOperationLoading] = useState({});

  // Refs для управления асинхронными операциями
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const hasAccess = useCallback(() => {
    if (currentUser?.is_admin) return true;
    return currentUser?.id?.toString() === userId;
  }, [currentUser, userId]);

  // Функция для безопасной установки состояния
  const safeSetState = (setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  // Функция загрузки файлов с защитой от утечек
  const fetchFiles = useCallback(async (signal) => {
    if (!hasAccess()) {
      safeSetState(setError, 'У вас нет доступа к файлам этого пользователя');
      safeSetState(setLoading, false);
      return;
    }

    try {
      safeSetState(setLoading, true);
      safeSetState(setError, null);

      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };

      if (currentUser?.is_admin && userId) {
        params.owner = userId;
      }

      const response = await api.get('/files/', { 
        params, 
        signal 
      });

      if (signal.aborted) return;

      const filesData = response.data.results || response.data || [];
      const totalCount = response.data.count || filesData.length;

      safeSetState(setFiles, filesData);
      safeSetState(setPagination, prev => ({
        ...prev,
        totalCount,
        totalPages: Math.ceil(totalCount / prev.pageSize) || 1,
      }));

    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || signal.aborted) {
        return;
      }
      
      console.error('Error fetching user files:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Не удалось загрузить файлы. Попробуйте позже.';
      
      safeSetState(setError, errorMessage);
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      if (!signal.aborted) {
        safeSetState(setLoading, false);
      }
    }
  }, [pagination.page, pagination.pageSize, userId, currentUser, hasAccess, enqueueSnackbar]);

  // Функция загрузки данных пользователя
  const fetchTargetUser = useCallback(async (signal) => {
    if (!hasAccess() || !isMountedRef.current) return;

    try {
      if (currentUser?.id?.toString() === userId) {
        safeSetState(setTargetUser, currentUser);
        return;
      }

      if (currentUser?.is_admin && userId) {
        const response = await api.get(`/users/${userId}/`, { signal });
        
        if (signal.aborted) return;
        safeSetState(setTargetUser, response.data);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || signal.aborted) {
        return;
      }
      
      console.error('Error fetching user data:', err);
      safeSetState(setTargetUser, null);
      enqueueSnackbar('Ошибка при загрузке данных пользователя', { 
        variant: 'error',
        autoHideDuration: 3000 
      });
    }
  }, [userId, currentUser, hasAccess, enqueueSnackbar]);

  // Основной эффект загрузки данных
  useEffect(() => {
    isMountedRef.current = true;

    if (!hasAccess()) {
      safeSetState(setLoading, false);
      safeSetState(setError, 'У вас нет доступа к файлам этого пользователя');
      return;
    }

    // Отменяем предыдущие запросы
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadData = async () => {
      try {
        await Promise.all([
          fetchFiles(signal),
          fetchTargetUser(signal)
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // Функция очистки
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFiles, fetchTargetUser, hasAccess]);

  // Эффект для обработки изменений пагинации
  useEffect(() => {
    if (!isMountedRef.current || !hasAccess()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    const loadFiles = async () => {
      try {
        await fetchFiles(abortControllerRef.current.signal);
      } catch (error) {
        console.error('Error loading files on page change:', error);
      }
    };

    loadFiles();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pagination.page, fetchFiles, hasAccess]);

  const handlePageChange = (event, newPage) => {
    safeSetState(setPagination, prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id) => {
    if (!isMountedRef.current) return;

    safeSetState(setOperationLoading, prev => ({ ...prev, [id]: true }));

    let blobUrl = null;
    try {
      await api.delete(`/files/${id}/`);
      
      // Оптимистичное обновление
      safeSetState(setFiles, prevFiles => prevFiles.filter(file => file.id !== id));
      safeSetState(setPagination, prev => {
        const newTotalCount = Math.max(prev.totalCount - 1, 0);
        const newTotalPages = Math.max(1, Math.ceil(newTotalCount / prev.pageSize));
        const newPage = prev.page > newTotalPages ? newTotalPages : prev.page;
        return {
          ...prev,
          totalCount: newTotalCount,
          totalPages: newTotalPages,
          page: newPage,
        };
      });

      enqueueSnackbar('Файл успешно удалён', { 
        variant: 'success',
        autoHideDuration: 3000 
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      
      // Восстанавливаем данные при ошибке
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchFiles(abortControllerRef.current.signal);

      const errorMessage = err.response?.data?.detail || 'Ошибка при удалении файла';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      safeSetState(setOperationLoading, prev => ({ ...prev, [id]: false }));
      
      // Очистка URL объектов
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    }
  };

  const handleDownload = async (id) => {
    if (!isMountedRef.current) return;

    safeSetState(setOperationLoading, prev => ({ ...prev, [`download_${id}`]: true }));

    let blobUrl = null;
    try {
      const response = await api.get(`/files/${id}/download/`, { 
        responseType: 'blob' 
      });

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `file_${id}`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch?.[1]) fileName = fileNameMatch[1];
      } else {
        const file = files.find(f => f.id === id);
        if (file?.original_name) fileName = file.original_name;
      }

      blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Обновляем время последнего скачивания
      safeSetState(setFiles, prev => prev.map(file => 
        file.id === id ? { ...file, last_download: new Date().toISOString() } : file
      ));

      enqueueSnackbar('Скачивание началось', { 
        variant: 'info',
        autoHideDuration: 3000 
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      const errorMessage = err.response?.data?.detail || 'Ошибка при скачивании файла';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      safeSetState(setOperationLoading, prev => ({ ...prev, [`download_${id}`]: false }));
      
      // Очистка URL объектов
      if (blobUrl) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    }
  };

  const handleRenameOpen = (file) => {
    safeSetState(setRenameDialog, { open: true, file });
  };

  const handleRenameClose = () => {
    safeSetState(setRenameDialog, { open: false, file: null });
  };

  const handleRenameSave = async (id, newName) => {
    if (!isMountedRef.current) return;

    try {
      await api.patch(`/files/${id}/`, { original_name: newName });
      
      safeSetState(setFiles, prevFiles =>
        prevFiles.map(f => (f.id === id ? { ...f, original_name: newName } : f))
      );
      
      enqueueSnackbar('Имя файла изменено', { 
        variant: 'success',
        autoHideDuration: 3000 
      });
      handleRenameClose();
    } catch (err) {
      console.error('Error renaming file:', err);
      const errorMessage = err.response?.data?.detail || 'Ошибка при переименовании файла';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    }
  };

  const handleCommentOpen = (file) => {
    safeSetState(setCommentDialog, { open: true, file });
  };

  const handleCommentClose = () => {
    safeSetState(setCommentDialog, { open: false, file: null });
  };

  const handleCommentSave = async (id, newComment) => {
    if (!isMountedRef.current) return;

    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      
      safeSetState(setFiles, prevFiles =>
        prevFiles.map(f => (f.id === id ? { ...f, comment: newComment } : f))
      );
      
      enqueueSnackbar('Комментарий обновлён', { 
        variant: 'success',
        autoHideDuration: 3000 
      });
      handleCommentClose();
    } catch (err) {
      console.error('Error updating comment:', err);
      const errorMessage = err.response?.data?.detail || 'Ошибка при обновлении комментария';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    }
  };

  const handleUploadSuccess = () => {
    if (!isMountedRef.current) return;

    // Сбрасываем на первую страницу и обновляем
    safeSetState(setPagination, prev => ({ ...prev, page: 1 }));
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    fetchFiles(abortControllerRef.current.signal);
  };

  const handleRetry = () => {
    if (!isMountedRef.current) return;

    safeSetState(setError, null);
    safeSetState(setLoading, true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    fetchFiles(abortControllerRef.current.signal);
  };

  if (loading && files.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && files.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
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
        <Box mt={2}>
          <Button 
            variant="contained" 
            onClick={() => navigate(-1)} 
            startIcon={<ArrowBackIcon />}
          >
            Назад
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button 
          variant="outlined" 
          onClick={() => navigate(-1)} 
          startIcon={<ArrowBackIcon />}
        >
          Назад
        </Button>
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            Файлы пользователя {targetUser?.username || userId}
          </Typography>
          {targetUser && (
            <Stack direction="row" spacing={1} mt={1}>
              <Chip 
                label={targetUser.is_admin ? 'Администратор' : 'Пользователь'} 
                size="small" 
                color={targetUser.is_admin ? 'secondary' : 'default'}
              />
              <Chip 
                label={`Файлов: ${pagination.totalCount}`} 
                size="small" 
                variant="outlined"
              />
            </Stack>
          )}
        </Box>
      </Stack>

      {hasAccess() && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <UploadButton 
              ownerId={userId} 
              onUploadSuccess={handleUploadSuccess}
            />
          </CardContent>
        </Card>
      )}

      {files.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            Файлы отсутствуют
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {hasAccess() ? 'Загрузите первый файл' : 'У пользователя нет файлов'}
          </Typography>
        </Box>
      ) : (
        <>
          <FileList
            files={files}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onRename={handleRenameOpen}
            onCommentUpdate={handleCommentOpen}
            canEdit={hasAccess()}
            operationLoading={operationLoading}
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

      <RenameDialog
        open={renameDialog.open}
        file={renameDialog.file}
        onClose={handleRenameClose}
        onSave={handleRenameSave}
      />

      <CommentDialog
        open={commentDialog.open}
        file={commentDialog.file}
        onClose={handleCommentClose}
        onCommentUpdate={handleCommentSave}
      />
    </Container>
  );
}