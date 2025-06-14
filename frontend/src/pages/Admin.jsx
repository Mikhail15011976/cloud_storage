import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  TableRow 
} from '@mui/material';
import { Header } from '../components/layout';
import { getUsers } from '../services/users';

export const Admin = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (user?.is_admin) {
          const data = await getUsers();
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header isAuthenticated />
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </>
  );
};