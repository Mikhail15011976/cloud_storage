import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import { FileGrid } from '../components/files';
import { getUserFiles } from '../services/users';

export default function UserFiles() {
  const { userId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserFiles(userId);
        setFiles(data.results || data);
      } catch (error) {
        console.error('Error fetching user files:', error);
        setError('Failed to load files. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [userId]);

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
            User Files
          </Typography>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          User Files
        </Typography>
        {files.length === 0 ? (
          <Typography>No files found for this user.</Typography>
        ) : (
          <FileGrid files={files} onFileClick={(file) => window.open(`/api/files/${file.id}/download/`, '_blank')} />
        )}
      </Box>
    </Container>
  );
}
