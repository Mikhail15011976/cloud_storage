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
  const { user } = useSelector(state => state.auth);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });
  const [renameDialog, setRenameDialog] = useState({
    open: false,
    file: null,
  });
  const [username, setUsername] = useState(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/files/?owner=${userId}`, {
        params: {
          page: pagination.page,
          page_size: pagination.pageSize,
        },
      });

      setFiles(response.data.results || response.data);
      setPagination((prev) => ({
        ...prev,
        totalCount: response.data.count || response.data.length,
      }));
    } catch (err) {
      console.error('Error fetching user files:', err);
      setError('Не удалось загрузить файлы. Попробуйте позже.');
      enqueueSnackbar('Ошибка при загрузке файлов пользователя', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, userId, enqueueSnackbar]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get(`/users/${userId}/`);
      setUsername(response.data.username);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setUsername(null);
      enqueueSnackbar('Ошибка при загрузке данных пользователя', { variant: 'error' });
    }
  }, [userId, enqueueSnackbar]);

  useEffect(() => {
    fetchFiles();
    fetchUser();
  }, [fetchFiles, fetchUser]);

  const handlePageChange = (event, newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/files/${id}/`);
      setFiles(files.filter((file) => file.id !== id));
      enqueueSnackbar('Файл успешно удален', { variant: 'success' });
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
        if (fileNameMatch && fileNameMatch[1]) fileName = fileNameMatch[1];
      } else {
        const file = files.find((f) => f.id === id);
        if (file && file.original_name) fileName = file.original_name;
      }

      const contentType = response.headers['content-type'];
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: contentType || 'application/octet-stream' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setFiles(files.map((file) =>
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
    setRenameDialog({
      open: true,
      file,
    });
  };

  const handleRenameClose = () => {
    setRenameDialog({
      open: false,
      file: null,
    });
  };

  const handleRenameSuccess = (fileId, newName) => {
    setFiles(files.map((file) =>
      file.id === fileId ? { ...file, original_name: newName } : file
    ));
    enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
    handleRenameClose();
  };

  const handleCommentUpdate = async (id, newComment) => {
    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      setFiles(files.map((file) =>
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
    navigate('/admin');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Файлы пользователя
          </Typography>
          <Typography color="error">{error}</Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            Назад к списку пользователей
          </Button>
        </Box>
      </Container>
    );
  }

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
            {!user?.is_admin && (
              <UploadButton
                onSuccess={fetchFiles}
                userId={userId}
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
              Файлы пользователя {username ? `(${username})` : `(ID: ${userId})`}
            </Typography>
          </Box>

          <FileList
            files={files}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onShare={handleShare}
            onRename={handleRename}
            onCommentUpdate={handleCommentUpdate}
            onView={handleView}
          />

          {pagination.totalCount > pagination.pageSize && (
            <Box mt={4} display="flex" justifyContent="center">
              <Pagination
                count={Math.ceil(pagination.totalCount / pagination.pageSize)}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
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
