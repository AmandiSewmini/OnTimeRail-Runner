import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { format } from 'date-fns';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { useAdmin } from '../../contexts/AdminContext';
import { updateComplaintStatus } from '../../firebase/complaintService';

export default function AdminComplaints() {
  const { currentAdmin } = useAdmin();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Response dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Format date from Firestore
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), 'MMM dd, yyyy HH:mm');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  // Fetch all complaints
  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    
    try {
      const complaintsRef = collection(db, "complaints");
      const q = query(complaintsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const complaintsList = [];
      querySnapshot.forEach((doc) => {
        complaintsList.push({ id: doc.id, ...doc.data() });
      });
      
      setComplaints(complaintsList);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      setError("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dialog open
  const handleOpenDialog = (complaint) => {
    setSelectedComplaint(complaint);
    setResponse(complaint.response || '');
    setNewStatus(complaint.status);
    setDialogOpen(true);
  };
  
  // Handle dialog close
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedComplaint(null);
    setResponse('');
    setNewStatus('');
  };
  
  // Submit response
  const handleSubmitResponse = async () => {
    if (!selectedComplaint || !newStatus) return;
    
    setSubmitting(true);
    
    try {
      await updateComplaintStatus(
        selectedComplaint.id,
        newStatus,
        response,
        currentAdmin.uid
      );
      
      // Refresh complaints list
      await fetchComplaints();
      
      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error("Error updating complaint:", error);
      setError("Failed to update complaint");
    } finally {
      setSubmitting(false);
    }
  };
  
  // Load complaints on component mount
  useEffect(() => {
    fetchComplaints();
  }, []);
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Complaint Management
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {complaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell>{complaint.id.slice(-6)}</TableCell>
                  <TableCell>{complaint.userEmail}</TableCell>
                  <TableCell>{complaint.type}</TableCell>
                  <TableCell>{complaint.subject}</TableCell>
                  <TableCell>{formatDate(complaint.createdAt)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={complaint.status} 
                      color={
                        complaint.status === 'Resolved' ? 'success' : 
                        complaint.status === 'Rejected' ? 'error' :
                        complaint.status === 'In Progress' ? 'info' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleOpenDialog(complaint)}
                    >
                      Respond
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {complaints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No complaints found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Response Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Respond to Complaint
        </DialogTitle>
        <DialogContent>
          {selectedComplaint && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Complaint Details
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {selectedComplaint.type}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Subject:</strong> {selectedComplaint.subject}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {selectedComplaint.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Submitted:</strong> {formatDate(selectedComplaint.createdAt)}
              </Typography>
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newStatus}
                    label="Status"
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Resolved">Resolved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Response"
                  multiline
                  rows={4}
                  fullWidth
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Enter your response to the complaint..."
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitResponse} 
            variant="contained" 
            disabled={submitting || !newStatus}
            color="primary"
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Response'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 