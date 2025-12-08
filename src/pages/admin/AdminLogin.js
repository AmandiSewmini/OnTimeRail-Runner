import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import Footer from '../../components/Footer';
import { LockOutlined } from '@mui/icons-material';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, currentAdmin, adminError } = useAdmin();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (currentAdmin) {
    return <Navigate to="/admin/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f4f4f9",
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            maxWidth: 400,
            minHeight: 500,
            px: 4,
            backgroundColor: "#fff",
            borderRadius: 4,
            boxShadow: 3,
            py: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <LockOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography
              component="h2"
              variant="h6"
              align="center"
              gutterBottom
              sx={{ fontWeight: 600, mt: 1 }}
            >
              Railway Admin Portal
            </Typography>
          </Box>

          {(error || adminError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || adminError}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Admin Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: 2,
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              borderRadius: 3,
              backgroundColor: "#007bff",
              fontWeight: "600",
              fontSize: "16px",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#0056b3",
              },
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In as Admin'}
          </Button>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}
