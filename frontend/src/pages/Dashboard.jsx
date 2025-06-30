import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon,
  ListItemText, 
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  Folder as FolderIcon,
  Image as ImageIcon,
  Movie as MovieIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
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
        return files.filter(file => ['PDF', 'WORD', 'TEXT'].includes(file.file_type));
      case 'trash':
        return [];
      default:
        return files;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'uploads': return <FolderIcon />;
      case 'photos': return <ImageIcon />;
      case 'videos': return <MovieIcon />;
      case 'documents': return <DescriptionIcon />;
      case 'trash': return <DeleteIcon />;
      default: return <FolderIcon />;
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
        {/* Левая колонка - меню и кнопка Upload */}
        <Grid item xs={12} md={3}>
          <Stack spacing={2} alignItems="center">
            <UploadButton 
              onSuccess={(newFile) => setFiles([...files, newFile])}
              startIcon={<UploadIcon />}
              sx={{ 
                width: '100%',
                maxWidth: 200,
                py: 1.5,
                fontWeight: 'bold'
              }}
            />
            
            <Paper elevation={3} sx={{ borderRadius: 2, width: '100%' }}>
              <List>
                {['uploads', 'photos', 'videos', 'documents', 'trash'].map((category) => (
                  <React.Fragment key={category}>
                    <ListItem 
                      button
                      selected={selectedCategory === category}
                      onClick={() => setSelectedCategory(category)}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          }
                        }
                      }}
                    >
                      <ListItemIcon>
                        {getCategoryIcon(category)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          category === 'uploads' ? 'All Files' :
                          category === 'photos' ? 'Images' :
                          category === 'videos' ? 'Videos' :
                          category === 'documents' ? 'Documents' :
                          'Trash'
                        } 
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Stack>
        </Grid>

        {/* Правая колонка - файлы */}
        <Grid item xs={12} md={9}>
          <Box 
            display="flex"
            justifyContent="center"
            mb={3}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 2,
              width: '100%'
            }}
          >
            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              My Files
            </Typography>
          </Box>
          
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
    </Container>
  );
}