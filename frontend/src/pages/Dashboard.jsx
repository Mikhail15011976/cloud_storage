import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import { FileList, UploadButton } from '../components/files';
import Header from '../components/layout/Header';
import { getFiles, deleteFile, renameFile, updateFileComment } from '../services/files';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await getFiles();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteFile(id);
      setFiles(files.filter(file => file.id !== id));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleDownload = (id) => {
    const file = files.find(f => f.id === id);
    if (file) {
      window.open(`/api/files/${id}/download/`, '_blank');
    }
  };

  const handleShare = async (id) => {
    try {
      const response = await api.post(`/files/${id}/share/`);
      const sharedLink = `${window.location.origin}/api/public/files/${response.data.shared_link}/`;
      alert(`Shareable link: ${sharedLink}`);
    } catch (error) {
      console.error('Error sharing file:', error);
    }
  };

  const handleRename = async (id, newName) => {
    try {
      await renameFile(id, newName);
      setFiles(files.map(file => 
        file.id === id ? { ...file, original_name: newName } : file
      ));
    } catch (error) {
      console.error('Error renaming file:', error);
    }
  };

  const handleCommentUpdate = async (id, newComment) => {
    try {
      await updateFileComment(id, newComment);
      setFiles(files.map(file => 
        file.id === id ? { ...file, comment: newComment } : file
      ));
    } catch (error) {
      console.error('Error updating comment:', error);
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
    <>
      <Header />
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            My Files
          </Typography>
          <UploadButton onSuccess={(newFile) => setFiles([...files, newFile])} />
          <FileList
            files={files}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onShare={handleShare}
            onRename={handleRename}
            onCommentUpdate={handleCommentUpdate}
          />
        </Box>
      </Container>
    </>
  );
}