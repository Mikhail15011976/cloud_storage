import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import { FileList, UploadButton } from '../components/files';
import Header from '../components/layout/Header';
import { getFiles } from '../services/files';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await getFiles();
        setFiles(data);
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleUploadSuccess = (newFile) => {
    setFiles([...files, newFile]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            My Files
          </Typography>
          <UploadButton onSuccess={handleUploadSuccess} />
          <FileList
            files={files}
            onDelete={(id) => console.log('delete', id)}
            onDownload={(id) => console.log('download', id)}
            onShare={(id) => console.log('share', id)}
          />
        </Box>
      </Container>
    </>
  );
}