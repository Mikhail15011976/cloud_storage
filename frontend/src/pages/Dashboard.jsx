import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Stack,
  Pagination,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import UploadIcon from '@mui/icons-material/Upload';
import { FileList, UploadButton } from '../components/files';
import api from '../services/api';

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0
  });
  const { enqueueSnackbar } = useSnackbar();

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/files/', {
        params: {
          page: pagination.page,
          page_size: pagination.pageSize
        }
      });
      
      setFiles(response.data.results || response.data);
      setPagination(prev => ({
        ...prev,
        totalCount: response.data.count || response.data.length
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      enqueueSnackbar('Ошибка при загрузке файлов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, enqueueSnackbar]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/files/${id}/`);
      setFiles(files.filter(file => file.id !== id));
      enqueueSnackbar('Файл успешно удален', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting file:', error);
      enqueueSnackbar('Ошибка при удалении файла', { variant: 'error' });
    }
  };

  const handleDownload = async (id) => {
    try {      
      const response = await api.get(`/files/${id}/download/`, {
        responseType: 'blob'
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
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType || 'application/octet-stream' }));
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
    } catch (error) {
      console.error('Error downloading file:', error);
      enqueueSnackbar('Ошибка при скачивании файла', { variant: 'error' });
    }
  };

  const handleShare = async (id) => {
    try {
      const response = await api.post(`/files/${id}/share/`);
      const sharedLink = response.data.shared_link;
      const fullLink = `${window.location.origin}/public/files/${sharedLink}`;      
      
      navigator.clipboard.writeText(fullLink).then(() => {
        enqueueSnackbar('Ссылка для общего доступа скопирована в буфер обмена', { variant: 'success' });
      }, () => {
        enqueueSnackbar('Не удалось скопировать ссылку в буфер обмена', { variant: 'error' });
      });
    } catch (error) {
      console.error('Error sharing file:', error);
      enqueueSnackbar('Ошибка при создании ссылки для общего доступа', { variant: 'error' });
    }
  };

  const handleRename = async (id, newName) => {
    try {
      await api.patch(`/files/${id}/rename/`, { new_name: newName });
      setFiles(files.map(file => 
        file.id === id ? { ...file, original_name: newName } : file
      ));
      enqueueSnackbar('Файл успешно переименован', { variant: 'success' });
    } catch (error) {
      console.error('Error renaming file:', error);
      enqueueSnackbar('Ошибка при переименовании файла', { variant: 'error' });
    }
  };

  const handleCommentUpdate = async (id, newComment) => {
    try {
      await api.patch(`/files/${id}/`, { comment: newComment });
      setFiles(files.map(file => 
        file.id === id ? { ...file, comment: newComment } : file
      ));
      enqueueSnackbar('Комментарий обновлен', { variant: 'success' });
    } catch (error) {
      console.error('Error updating comment:', error);
      enqueueSnackbar('Ошибка при обновлении комментария', { variant: 'error' });
    }
  };

  const handleView = (id) => {
    try {      
      const viewUrl = `${api.defaults.baseURL}/files/${id}/download/`;      
      window.open(viewUrl, '_blank');
      enqueueSnackbar('Файл открыт для просмотра', { variant: 'success' });
    } catch (error) {
      console.error('Error viewing file:', error);
      enqueueSnackbar('Ошибка при открытии файла для просмотра', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <UploadButton 
              onSuccess={fetchFiles}
              startIcon={<UploadIcon />}
              sx={{ 
                width: '100%',
                py: 1.5,
                fontWeight: 'bold'
              }}
            />
          </Stack>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              My Files
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
    </Container>
  );
}

export default Dashboard;
