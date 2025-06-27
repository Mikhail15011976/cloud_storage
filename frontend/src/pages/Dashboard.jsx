import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Grid, List, ListItem, ListItemText, Paper } from '@mui/material';
import { FileList, UploadButton } from '../components/files';
import { getFiles, deleteFile, renameFile, updateFileComment } from '../services/files';
import api from '../services/api';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('uploads');

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

  const getFilteredFiles = () => {
    switch (selectedCategory) {
      case 'uploads':
        return files;
      case 'photos':
        return files.filter(file => file.file_type === 'IMAGE');
      case 'videos':
        return files.filter(file => file.file_type === 'VIDEO');
      case 'documents':
        return files.filter(file => file.file_type === 'PDF' || file.file_type === 'WORD' || file.file_type === 'TEXT');
      case 'trash':
        return [];
      default:
        return files;
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
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          My Files
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={3}>
            <Paper elevation={3} sx={{ height: '100%' }}>
              <List>
                {['uploads', 'photos', 'videos', 'documents', 'trash'].map((category) => (
                  <ListItem 
                    key={category}
                    button
                    selected={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <ListItemText 
                      primary={
                        category === 'uploads' ? 'Загрузки' :
                        category === 'photos' ? 'Фото' :
                        category === 'videos' ? 'Видео' :
                        category === 'documents' ? 'Документы' :
                        'Корзина'
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={9}>
            <UploadButton onSuccess={(newFile) => setFiles([...files, newFile])} />
            <FileList
              files={getFilteredFiles()}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onShare={handleShare}
              onRename={handleRename}
              onCommentUpdate={handleCommentUpdate}
            />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}