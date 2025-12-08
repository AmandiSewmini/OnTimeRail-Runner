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
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  Timestamp, 
  orderBy 
} from 'firebase/firestore';

export default function BookingsManagement() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Function to fetch all bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const bookingsRef = collection(db, "bookings");
      const q = query(bookingsRef, orderBy("bookedAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const bookingsList = [];
      querySnapshot.forEach((doc) => {
        bookingsList.push({ id: doc.id, ...doc.data() });
      });
      
      setBookings(bookingsList);
      setFilteredBookings(bookingsList);
      setError(null);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Function to handle search and filtering
  useEffect(() => {
    let results = [...bookings];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(booking => booking.status === filterStatus);
    }
    
    // Apply search term filter if exists
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      results = results.filter(booking => 
        (booking.trainName && booking.trainName.toLowerCase().includes(lowerCaseSearch)) ||
        (booking.userEmail && booking.userEmail.toLowerCase().includes(lowerCaseSearch)) ||
        (booking.from && booking.from.toLowerCase().includes(lowerCaseSearch)) ||
        (booking.to && booking.to.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    setFilteredBookings(results);
  }, [bookings, searchTerm, filterStatus]);

  const handleOpenDialog = (booking) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCancelBooking = async (booking) => {
    if (window.confirm(`Are you sure you want to cancel this booking for ${booking.userEmail}?`)) {
      try {
        // Update booking status in Firestore
        const bookingRef = doc(db, "bookings", booking.id);
        await updateDoc(bookingRef, {
          status: 'Cancelled',
          cancelledAt: Timestamp.now()
        });
        
        // Optionally update available seats in the train document
        // This would require a transaction to increment the availableSeats count
        
        setNotification({
          open: true,
          message: 'Booking cancelled successfully',
          severity: 'success'
        });
        
        // Refresh bookings list
        fetchBookings();
      } catch (err) {
        console.error("Error cancelling booking:", err);
        setNotification({
          open: true,
          message: 'Error cancelling booking: ' + err.message,
          severity: 'error'
        });
      }
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
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
        Manage Bookings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="Search bookings"
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
            <MenuItem value="all">All Bookings</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
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
              <TableCell>Booking ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Train</TableCell>
              <TableCell>Journey</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Booked At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {booking.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{booking.userEmail}</TableCell>
                  <TableCell>{booking.trainName} ({booking.trainId && booking.trainId.substring(0, 6)}...)</TableCell>
                  <TableCell>{booking.from} → {booking.to}</TableCell>
                  <TableCell>
                    {booking.date instanceof Timestamp 
                      ? booking.date.toDate().toLocaleDateString() 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={booking.status} 
                      color={booking.status === 'Confirmed' ? 'success' : 'error'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {booking.bookedAt instanceof Timestamp 
                      ? booking.bookedAt.toDate().toLocaleString() 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleOpenDialog(booking)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {booking.status === 'Confirmed' && (
                      <Tooltip title="Cancel Booking">
                        <IconButton 
                          color="error" 
                          size="small" 
                          onClick={() => handleCancelBooking(booking)}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No bookings found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Booking ID:</strong> {selectedBooking.id}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Customer:</strong> {selectedBooking.userEmail}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Train:</strong> {selectedBooking.trainName}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>From:</strong> {selectedBooking.from}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>To:</strong> {selectedBooking.to}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Date:</strong> {selectedBooking.date instanceof Timestamp 
                  ? selectedBooking.date.toDate().toLocaleDateString() 
                  : 'N/A'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Status:</strong> {selectedBooking.status}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Booked At:</strong> {selectedBooking.bookedAt instanceof Timestamp 
                  ? selectedBooking.bookedAt.toDate().toLocaleString() 
                  : 'N/A'}
              </Typography>
              {selectedBooking.cancelledAt && (
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Cancelled At:</strong> {selectedBooking.cancelledAt instanceof Timestamp 
                    ? selectedBooking.cancelledAt.toDate().toLocaleString() 
                    : 'N/A'}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedBooking && selectedBooking.status === 'Confirmed' && (
            <Button 
              variant="contained" 
              color="error" 
              onClick={() => {
                handleCloseDialog();
                handleCancelBooking(selectedBooking);
              }}
            >
              Cancel Booking
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