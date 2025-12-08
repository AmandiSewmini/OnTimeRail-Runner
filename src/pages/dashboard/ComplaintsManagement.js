import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Feedback, 
  Send, 
  AccessTime,
  CheckCircle,
  Error,
  Reply
} from '@mui/icons-material';
import { format } from 'date-fns';
import { auth } from '../../firebase/config';
import { 
  submitComplaint, 
  getUserComplaints, 
  addComplaintFollowUp 
} from '../../firebase/complaintService';

export default function ComplaintsManagement() {
  const currentUser = auth.currentUser;
  
  // Form state
  const [complaintForm, setComplaintForm] = useState({
    type: '',
    subject: '',
    description: '',
    contactInfo: ''
  });
  
  // Complaints list state
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState('');
  
  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  
  // Follow-up dialog state
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [followingUp, setFollowingUp] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  
  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setComplaintForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Fetch user complaints
  const fetchMyComplaints = async () => {
    if (!currentUser) {
      setComplaintsError('Please log in to view your complaints.');
      return;
    }
    
    setLoadingComplaints(true);
    setComplaintsError('');
    
    try {
      const complaints = await getUserComplaints(currentUser.uid);
      setMyComplaints(complaints);
      
      if (complaints.length === 0) {
        setComplaintsError('You haven\'t submitted any complaints yet.');
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
      setComplaintsError(error.message || 'Failed to load your complaints.');
    } finally {
      setLoadingComplaints(false);
    }
  };
  
  // Submit complaint
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!currentUser) {
      setSubmitError('You must be logged in to submit a complaint.');
      return;
    }
    
    // Validate required fields
    if (!complaintForm.type || !complaintForm.subject || !complaintForm.description) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      await submitComplaint(complaintForm, currentUser);
      setSuccessDialogOpen(true);
      
      // Refresh the complaints list
      fetchMyComplaints();
      
    } catch (error) {
      console.error("Error submitting complaint:", error);
      setSubmitError(error.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle dialog close
  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    // Reset form after successful submission
    setComplaintForm({
      type: '',
      subject: '',
      description: '',
      contactInfo: ''
    });
  };
  
  // Handle follow-up
  const handleOpenFollowUp = (complaint) => {
    setSelectedComplaint(complaint);
    setFollowUpMessage('');
    setFollowUpError('');
    setFollowUpDialogOpen(true);
  };
  
  const handleCloseFollowUp = () => {
    setFollowUpDialogOpen(false);
  };
  
  const handleFollowUpSubmit = async () => {
    if (!followUpMessage.trim()) {
      setFollowUpError('Please enter a message.');
      return;
    }
    
    setFollowingUp(true);
    setFollowUpError('');
    
    try {
      await addComplaintFollowUp(selectedComplaint.id, followUpMessage, currentUser.uid);
      
      // Close dialog and refresh complaints
      setFollowUpDialogOpen(false);
      fetchMyComplaints();
      
    } catch (error) {
      console.error("Error submitting follow-up:", error);
      setFollowUpError(error.message || 'Failed to submit follow-up. Please try again.');
    } finally {
      setFollowingUp(false);
    }
  };
  
  // Format date from Firestore
  const renderDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), 'yyyy-MM-dd');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  // Load complaints when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchMyComplaints();
    }
  }, [currentUser]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Complaints Management
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Submit a Complaint
            </Typography>
            
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
            
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Complaint Type</InputLabel>
                    <Select
                      name="type"
                      value={complaintForm.type}
                      label="Complaint Type"
                      onChange={handleFormChange}
                    >
                      <MenuItem value="schedule">Schedule Issue</MenuItem>
                      <MenuItem value="service">Service Issue</MenuItem>
                      <MenuItem value="facility">Facility Concern</MenuItem>
                      <MenuItem value="staff">Staff Behavior</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="subject"
                    fullWidth
                    label="Subject"
                    variant="outlined"
                    required
                    value={complaintForm.subject}
                    onChange={handleFormChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    fullWidth
                    label="Complaint Details"
                    multiline
                    rows={6}
                    variant="outlined"
                    value={complaintForm.description}
                    onChange={handleFormChange}
                    required
                    placeholder="Please provide detailed information about your complaint..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="contactInfo"
                    fullWidth
                    label="Contact Information (optional)"
                    variant="outlined"
                    value={complaintForm.contactInfo}
                    onChange={handleFormChange}
                    placeholder="Additional contact information if different from your account"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                    size="large"
                    type="submit"
                    fullWidth
                    disabled={submitting || !complaintForm.type || !complaintForm.subject || !complaintForm.description}
                  >
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, maxHeight: '600px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Your Previous Complaints
            </Typography>
            
            {loadingComplaints && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {complaintsError && !loadingComplaints && myComplaints.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>{complaintsError}</Alert>
            )}
            
            {!loadingComplaints && myComplaints.length > 0 && (
              <>
                {myComplaints.map((complaint) => (
                  <Card key={complaint.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">
                          {complaint.subject}
                        </Typography>
                        <Chip 
                          label={complaint.status} 
                          color={
                            complaint.status === 'Resolved' ? 'success' : 
                            complaint.status === 'Rejected' ? 'error' :
                            complaint.status === 'In Progress' ? 'info' : 'default'
                          } 
                          size="small" 
                          icon={
                            complaint.status === 'Resolved' ? <CheckCircle /> : 
                            complaint.status === 'Rejected' ? <Error /> :
                            <AccessTime />
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {complaint.type} • Submitted on {renderDate(complaint.createdAt)}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" paragraph>
                        {complaint.description}
                      </Typography>
                      
                      {complaint.response && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Response from Customer Service:
                          </Typography>
                          <Typography variant="body2">
                            {complaint.response}
                          </Typography>
                          {complaint.updatedAt && (
                            <Typography variant="caption" color="textSecondary">
                              {renderDate(complaint.updatedAt)}
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {/* Conversation/follow-ups if they exist */}
                      {complaint.conversation && complaint.conversation.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Follow-up Messages:
                          </Typography>
                          {complaint.conversation.map((message, index) => (
                            <Box 
                              key={index} 
                              sx={{ 
                                p: 1, 
                                my: 1, 
                                bgcolor: message.sender === 'user' ? 'primary.light' : 'background.default',
                                borderRadius: 1,
                                color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary'
                              }}
                            >
                              <Typography variant="body2">{message.message}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', textAlign: 'right' }}>
                                {message.sender === 'user' ? 'You' : 'Customer Service'} • {renderDate(message.timestamp)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      {complaint.status !== 'Resolved' && complaint.status !== 'Rejected' && (
                        <Button 
                          size="small" 
                          color="primary" 
                          startIcon={<Reply />}
                          onClick={() => handleOpenFollowUp(complaint)}
                        >
                          Follow Up
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>{"Complaint Submitted Successfully"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your complaint has been received. Our customer service team will review it and respond within 48 hours.
            You can track the status of your complaint in the "Your Previous Complaints" section.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Follow Up Dialog */}
      <Dialog
        open={followUpDialogOpen}
        onClose={handleCloseFollowUp}
      >
        <DialogTitle>{"Add Follow-up to Complaint"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Add additional information or follow up on complaint: <strong>{selectedComplaint?.subject}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Follow-up Message"
            fullWidth
            multiline
            rows={4}
            value={followUpMessage}
            onChange={(e) => setFollowUpMessage(e.target.value)}
          />
          {followUpError && <Alert severity="error" sx={{ mt: 2 }}>{followUpError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFollowUp} disabled={followingUp}>
            Cancel
          </Button>
          <Button 
            onClick={handleFollowUpSubmit} 
            color="primary" 
            disabled={followingUp || !followUpMessage.trim()}
            startIcon={followingUp ? <CircularProgress size={20} /> : null}
          >
            {followingUp ? 'Sending...' : 'Send Follow-up'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 