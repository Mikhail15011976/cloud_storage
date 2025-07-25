import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from '@mui/material';
import { getUsers, updateUser, deleteUser, getUserFiles } from '../services/users';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [userLoading, setUserLoading] = useState({});
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUsers();
        const usersData = data.results || data;
        
        const updatedUsers = await Promise.all(
          usersData.map(async (user) => {
            try {
              const filesData = await getUserFiles(user.id);
              const files = filesData.results || filesData;
              return { ...user, files_count: files.length };
            } catch (err) {
              console.error(`Error fetching files for user ${user.username}:`, err);
              return { ...user, files_count: 0 };
            }
          })
        );

        setUsers(updatedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Обработчик изменения статуса администратора
  const handleToggleAdmin = async (userId, currentStatus) => {
    setUserLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const updatedUser = await updateUser(userId, { is_admin: !currentStatus });
      setUsers(users.map((u) => (u.id === userId ? updatedUser : u)));
      setSnackbar({
        open: true,
        message: `Admin status for ${updatedUser.username} updated to ${updatedUser.is_admin ? 'Administrator' : 'Regular User'}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update admin status.',
        severity: 'error',
      });
    } finally {
      setUserLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Обработчик удаления пользователя
  const handleDeleteUser = async (userId) => {
    setUserLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setSnackbar({
        open: true,
        message: 'User deleted successfully.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user.',
        severity: 'error',
      });
    } finally {
      setUserLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Обработчик просмотра файлов пользователя
  const handleViewFiles = (userId) => {
    navigate(`/admin/user/${userId}/files`);
  };

  // Обработчик переключения вкладок
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Закрытие уведомления
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Отображение индикатора загрузки
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Отображение ошибки, если она произошла
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
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
          Admin Dashboard
        </Typography>
        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="admin tabs"
          sx={{ mb: 2 }}
        >
          <Tab label="Users" />
          <Tab label="Settings" />
        </Tabs>
        
        {activeTab === 0 && (
          <>
            {users.length === 0 ? (
              <Typography>No users found.</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Full Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Admin</TableCell>
                      <TableCell>Storage Used</TableCell>
                      <TableCell>Files Count</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(users) &&
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </TableCell>
                          <TableCell>{user.is_admin ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            {formatStorageSize(user.storage_used)}
                          </TableCell>
                          <TableCell>{user.files_count || 0}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ mr: 1 }}
                              onClick={() =>
                                handleToggleAdmin(user.id, user.is_admin)
                              }
                              disabled={userLoading[user.id] || false}
                            >
                              {userLoading[user.id] ? (
                                <CircularProgress size={24} />
                              ) : (
                                'Toggle Admin'
                              )}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ mr: 1 }}
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={userLoading[user.id] || false}
                            >
                              Delete
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewFiles(user.id)}
                            >
                              View Files
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {/* Вкладка "Settings" - настройки системы (заглушка для будущей реализации) */}
        {activeTab === 1 && (
          <Box mt={2}>
            <Typography variant="h6">System Settings</Typography>
            <Typography>
              Manage system-wide settings such as storage quotas, maximum upload
              size, etc. (Coming soon)
            </Typography>
          </Box>
        )}
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Функция для форматирования размера хранилища в удобочитаемый вид
const formatStorageSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
