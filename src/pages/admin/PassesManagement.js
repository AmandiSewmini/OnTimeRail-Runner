import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  IconButton,
  Grid
} from '@mui/material';
import { 
  Search as SearchIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { 
  updatePassStatus, 
  getPassDetails 
} from '../../firebase/seasonPassService';

export default function PassesManagement() {
  const [passes, setPasses] = useState([]);
  const [filteredPasses, setFilteredPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchPasses();
  }, []);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      
      const passesRef = collection(db, "seasonPasses");
      // Query all passes, ordered by creation date (newest first)
      const q = query(passesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const passesList = [];
      querySnapshot.forEach((doc) => {
        passesList.push({ id: doc.id, ...doc.data() });
      });
      
      setPasses(passesList);
      setFilteredPasses(passesList);
      setError(null);
    } catch (err) {
      console.error("Error fetching season passes:", err);
      setError("Failed to load season passes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters when search term or status filter changes
  useEffect(() => {
    let results = [...passes];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(pass => pass.status === filterStatus);
    }
    
    // Apply search term filter if exists
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      results = results.filter(pass => 
        (pass.fullName && pass.fullName.toLowerCase().includes(lowerCaseSearch)) ||
        (pass.userEmail && pass.userEmail.toLowerCase().includes(lowerCaseSearch)) ||
        (pass.idNumber && pass.idNumber.toLowerCase().includes(lowerCaseSearch)) ||
        (pass.fromStation && pass.fromStation.toLowerCase().includes(lowerCaseSearch)) ||
        (pass.toStation && pass.toStation.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    setFilteredPasses(results);
  }, [passes, searchTerm, filterStatus]);

  const handleOpenDialog = async (passId) => {
    try {
      const passDetails = await getPassDetails(passId);
      if (passDetails) {
        setSelectedPass(passDetails);
        setDialogOpen(true);
      }
    } catch (err) {
      console.error("Error getting pass details:", err);
      setNotification({
        open: true,
        message: 'Error loading pass details: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPass(null);
  };

  const handleStatusChange = async (passId, newStatus) => {
    try {
      await updatePassStatus(passId, newStatus);
      
      setNotification({
        open: true,
        message: `Season pass status updated to ${newStatus}`,
        severity: 'success'
      });
      
      // If we're in the dialog, close it
      if (dialogOpen) {
        handleCloseDialog();
      }
      
      // Refresh passes list
      fetchPasses();
    } catch (err) {
      console.error("Error updating pass status:", err);
      setNotification({
        open: true,
        message: 'Error updating status: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Active': return 'success';
      case 'Expired': return 'default';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPassTypeLabel = (passType) => {
    switch (passType) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly (3 months)';
      case 'biannual': return 'Biannual (6 months)';
      case 'annual': return 'Annual (12 months)';
      default: return passType;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom component="div">
        Season Passes Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="Search passes"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: '400px' }}
          InputProps={{
            endAdornment: <SearchIcon />
          }}
        />
        
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Passes</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          onClick={() => {
            setSearchTerm('');
            setFilterStatus('all');
          }}
        >
          Clear Filters
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID Number</TableCell>
              <TableCell>Holder Name</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Valid Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPasses.length > 0 ? (
              filteredPasses.map((pass) => (
                <TableRow key={pass.id}>
                  <TableCell>{pass.idNumber}</TableCell>
                  <TableCell>{pass.fullName}</TableCell>
                  <TableCell>{pass.fromStation} → {pass.toStation}</TableCell>
                  <TableCell>
                    {getPassTypeLabel(pass.passType)}
                    <Typography variant="caption" display="block" color="textSecondary">
                      {pass.class} class
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(pass.validFrom)} - {formatDate(pass.validTo)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={pass.status} 
                      color={getStatusChipColor(pass.status)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleOpenDialog(pass.id)}
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                    
                    {pass.status === 'Pending' && (
                      <>
                        <IconButton 
                          color="success" 
                          onClick={() => handleStatusChange(pass.id, 'Active')}
                          title="Approve"
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleStatusChange(pass.id, 'Cancelled')}
                          title="Reject"
                        >
                          <RejectIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No season passes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pass Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Season Pass Details</DialogTitle>
        <DialogContent>
          {selectedPass && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pass Holder
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {selectedPass.fullName}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  ID Number
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {selectedPass.idNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.userEmail}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.phone}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  From Station
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.fromStation}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  To Station
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.toStation}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Pass Type
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {getPassTypeLabel(selectedPass.passType)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Travel Class
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.class}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Cost
                </Typography>
                <Typography variant="body1" gutterBottom fontWeight="bold">
                  {formatCurrency(selectedPass.cost)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Valid From
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.validFrom ? selectedPass.validFrom.toDate().toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Valid To
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.validTo ? selectedPass.validTo.toDate().toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Application Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPass.createdAt ? selectedPass.createdAt.toDate().toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip 
                  label={selectedPass.status} 
                  color={getStatusChipColor(selectedPass.status)} 
                />
              </Grid>
              
              {selectedPass.comments && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Comments
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Typography variant="body2">
                      {selectedPass.comments}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedPass.renewedFrom && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Renewed From
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Previous pass ID: {selectedPass.renewedFrom}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          
          {selectedPass && selectedPass.status === 'Pending' && (
            <>
              <Button 
                variant="contained" 
                color="error" 
                onClick={() => handleStatusChange(selectedPass.id, 'Cancelled')}
              >
                Reject
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                onClick={() => handleStatusChange(selectedPass.id, 'Active')}
              >
                Approve
              </Button>
            </>
          )}
          
          {selectedPass && selectedPass.status === 'Active' && (
            <Button 
              variant="contained" 
              color="error" 
              onClick={() => handleStatusChange(selectedPass.id, 'Cancelled')}
            >
              Cancel Pass
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 