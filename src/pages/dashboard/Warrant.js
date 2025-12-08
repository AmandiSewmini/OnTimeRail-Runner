import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Container, Paper, CircularProgress, Alert, Grid } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import Footer from '../../components/Footer';
import { db } from '../../firebase/config'; // Firebase Firestore import
import { collection, addDoc } from 'firebase/firestore'; // Firestore methods for adding data

export default function WarrantApplication() {
  const [applicantName, setApplicantName] = useState('');
  const [applicationReason, setApplicationReason] = useState('');
  const [applicantID, setApplicantID] = useState('');
  const [dateOfRequest, setDateOfRequest] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!applicantName || !applicationReason || !applicantID || !dateOfRequest || !officerName) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Reference to your Firestore collection
      const warrantCollectionRef = collection(db, 'warrantApplications');

      // Add a new document to Firestore
      await addDoc(warrantCollectionRef, {
        applicantName,
        applicationReason,
        applicantID,
        dateOfRequest,
        officerName,
        createdAt: new Date(),
      });

      setLoading(false);
      alert('Warrant application submitted successfully!');
      setApplicantName('');
      setApplicationReason('');
      setApplicantID('');
      setDateOfRequest('');
      setOfficerName('');
    } catch (error) {
      setLoading(false);
      setError('Failed to submit application');
      console.error('Error adding document: ', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f4f4f9',
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <LockOutlined sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography component="h2" variant="h6" align="center" gutterBottom sx={{ fontWeight: 600 }}>
                Official Warrant Application Form
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Applicant Name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: 2,
                      },
                    }}
                    disabled={loading}
                    autoFocus
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Applicant ID Number"
                    value={applicantID}
                    onChange={(e) => setApplicantID(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: 2,
                      },
                    }}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Reason for Application"
                    value={applicationReason}
                    onChange={(e) => setApplicationReason(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: 2,
                      },
                    }}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Date of Request"
                    type="date"
                    value={dateOfRequest}
                    onChange={(e) => setDateOfRequest(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: 2,
                      },
                    }}
                    disabled={loading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Officer in Charge Name"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: 2,
                      },
                    }}
                    disabled={loading}
                  />
                </Grid>
              </Grid>

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
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Application'}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
