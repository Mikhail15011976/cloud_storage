import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Stack,
  Button,
  Pagination,
  Alert,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FileList, UploadButton } from '../components/files';
import api from '../services/api';
import { RenameDialog } from '../components/files/RenameDialog';

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
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
  });
  const [renameDialog, setRenameDialog] = useState({
    open: false,
    file: null,
  });
  const [targetUser, setTargetUser] = useState(null);
  
  const hasAccess = useCallback(() => {
    if (currentUser?.is_admin) return true;
    return currentUser?.id?.toString() === userId;
  }, [currentUser, userId]);
  
  const fetchFiles = useCallback(async () => {
    if (!hasAccess()) {
      setError('У вас нет доступа к файлам этого пользователя');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);      
      
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };
      
      if (currentUser?.is_admin && userId) {
        params.owner = userId;
      }
      
      console.log('Fetching files with params:', params);
      
      const response = await api.get('/files/', { params });

      const filesData = response.data.results || response.data;
      const totalCount = response.data.count || filesData.length;
      
      setFiles(filesData);
      setPagination(prev => ({
        ...prev,
        totalCount,
        totalPages: Math.ceil(totalCount / prev.pageSize),
      }));
    } catch (err) {
      console.error('Error fetching user files:', err);
      const errorMessage = err.response?.data?.detail || 'Не удалось загрузить файлы. Попробуйте позже.';
      setError(errorMessage);
      enqueueSnackbar('Ошибка при загрузке файлов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, userId, currentUser, hasAccess, enqueueSnackbar]);
  
  const fetchTargetUser = useCallback(async () => {
    if (!hasAccess()) return;

    try {
      if (currentUser?.id?.toString() === userId) {
        setTargetUser(currentUser);
        return;
      }

      if (currentUser?.is_admin && userId) {
        const response = await api.get(`/users/${userId}/`);
        setTargetUser(response.data);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setTargetUser(null);
      enqueueSnackbar('Ошибка при загрузке данных пользователя', { variant: 'error' });
    }
  }, [userId, currentUser, hasAccess, enqueueSnackbar]);
  
  useEffect(() => {
    if (hasAccess()) {
      fetchFiles();
      fetchTargetUser();
    } else {
      setLoading(false);
    }
  }, [fetchFiles, fetchTargetUser, hasAccess]);
  
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/files/${id}/`);
      setFiles(files.filter(file => file.id !== id));
      enqueueSnackbar('Файл успешно удален', { variant: 'success' });
      
      setPagination(prev => ({
        ...prev,
        totalCount: prev.totalCount - 1,
        totalPages: Math.ceil((prev.totalCount - 1) / prev.pageSize),
      }));
    } catch (err) {
      console.error('Error deleting file:', err);
      enqueueSnackbar('Ошибка при удалении файла', { variant: 'error' });
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/files/${id}/download/`, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `file_${id}`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch?.[1]) fileName = fileNameMatch[1];
      } else {
        const file = files.find(f => f.id === id);
        if (file?.original_name) fileName = file.original_name;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setFiles(files.map(file =>
        file.id === id ? { ...file, last_download: new Date().toISOString() } : file
      ));
      
      enqueueSnackbar(`Файл "${fileName}" успешно скачан`, { variant: 'success' });
    } catch (err) {
      console.error('Error downloading file:', err);
      enqueueSnackbar('Ошибка при скачивании файла', { variant: 'error' });
    }
  };

  const handleShare = async (id) => {
    try {
      const response = await api.post(`/files/${id}/share/`);
      const sharedLink = response.data.shared_link;
      const fullLink = `${window.location.origin}/public/files/${sharedLink}`;

      navigator.clipboard.writeText(fullLink).then(
        () => enqueueSnackbar('Ссылка скопирована в буфер обмена', { variant: 'success' }),
        () => enqueueSnackbar('Не удалось скопировать ссылку', { variant: 'error' })
      );
    } catch (err) {
      console.error('Error sharing file:', err);
      enqueueSnackbar('Ошибка при создании ссылки', { variant: 'error' });
    }
  };

  const handleRename = (file) => {
    setRenameDialog({ open: true, file });
  };

  const handleRenameClose = () => {
    setRenameDialog({ open: false, file: null });
  };

  const handleRenameSuccess = (fileId, newName) => {
    setFiles(files.map(file =>
      file.id === fileId ? { ...file, original_name: newName } : file
    ));
    enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
    handleRenameClose();
  };

  const handleCommentUpdate = async (id, newComment) => {
    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      setFiles(files.map(file =>
        file.id === id ? { ...file, comment: newComment } : file
      ));
      enqueueSnackbar('Комментарий обновлен', { variant: 'success' });
    } catch (err) {
      console.error('Error updating comment:', err);
      enqueueSnackbar('Ошибка при обновлении комментария', { variant: 'error' });
    }
  };

  const handleView = (id) => {
    try {
      const viewUrl = `${api.defaults.baseURL}/files/${id}/download/`;
      window.open(viewUrl, '_blank');
      enqueueSnackbar('Файл открыт для просмотра', { variant: 'success' });
    } catch (err) {
      console.error('Error viewing file:', err);
      enqueueSnackbar('Ошибка при открытии файла', { variant: 'error' });
    }
  };

  const handleBack = () => {
    navigate(currentUser?.is_admin ? '/admin' : '/dashboard');
  };

  const handleUploadSuccess = () => {
    fetchFiles();
  };
  
  useEffect(() => {
    if (hasAccess()) {
      fetchFiles();
    }
  }, [pagination.page, hasAccess, fetchFiles, currentUser, userId]); // Добавлены недостающие зависимости

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess()) {
    return (
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Файлы пользователя
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            У вас нет доступа к этой странице
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            Назад
          </Button>
        </Box>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.id?.toString() === userId;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ width: '100%', py: 1.5 }}
            >
              Назад
            </Button>
            
            {isOwnProfile && (
              <UploadButton
                onSuccess={handleUploadSuccess}
                sx={{
                  width: '100%',
                  py: 1.5,
                  fontWeight: 'bold',
                }}
              />
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {isOwnProfile ? 'Мои файлы' : `Файлы пользователя ${targetUser?.username || `(ID: ${userId})`}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Всего файлов: {pagination.totalCount}
            </Typography>
          </Box>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : files.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Файлы не найдены
              </Typography>
            </Box>
          ) : (
            <>
              <FileList
                files={files}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onShare={handleShare}
                onRename={handleRename}
                onCommentUpdate={handleCommentUpdate}
                onView={handleView}
              />

              {pagination.totalPages > 1 && (
                <Box mt={4} display="flex" justifyContent="center">
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>

      {renameDialog.file && (
        <RenameDialog
          open={renameDialog.open}
          onClose={handleRenameClose}
          file={renameDialog.file}
          onRename={handleRenameSuccess}
        />
      )}
    </Container>
  );
}