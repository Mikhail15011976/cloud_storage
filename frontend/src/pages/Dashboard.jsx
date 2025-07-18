import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Stack,
  Pagination
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { FileGrid, UploadButton } from '../components/files';
import api from '../services/api';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0
  });

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
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileClick = (file) => {
    window.open(`/api/files/${file.id}/download/`, '_blank');
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
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
          <Box mb={3}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Мои файлы
            </Typography>
          </Box>
          
          <FileGrid 
            files={files} 
            onFileClick={handleFileClick}
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