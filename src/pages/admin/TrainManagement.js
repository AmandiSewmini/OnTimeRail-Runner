import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';

const generateUniqueTrainNumber = (trains) => {
  let base = 1000;
  const existingNumbers = trains.map(train => parseInt(train.trainNumber, 10)).filter(n => !isNaN(n));
  while (existingNumbers.includes(base)) {
    base++;
  }
  return base.toString();
};

const sriLankaStations = [
  'Colombo Fort',
  'Maradana',
  'Galle',
  'Kandy',
  'Matara',
  'Jaffna',
  'Anuradhapura',
  'Badulla',
  'Polonnaruwa',
  'Kurunegala',
  'Vavuniya',
  'Batticaloa',
  'Beliatta',
  'Kalutara'
];

export default function TrainManagement() {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTrain, setCurrentTrain] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    name: '',
    trainNumber: '',
    departureStation: '',
    arrivalStation: '',
    serviceType: 'daily',
    departureTime: '',
    totalSeats: 0
  });

  useEffect(() => {
    fetchTrains();
  }, []);

  const fetchTrains = async () => {
    try {
      setLoading(true);
      const trainsRef = collection(db, 'trains');
      const q = query(trainsRef, orderBy('trainNumber', 'asc'));
      const querySnapshot = await getDocs(q);

      const trainData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTrains(trainData);
      setError(null);
    } catch (err) {
      console.error("Error fetching trains:", err);
      setError("Failed to load trains. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOpenDialog = (train = null) => {
    if (train) {
      setFormData({
        name: train.name || '',
        trainNumber: train.trainNumber || '',
        departureStation: train.departureStation || '',
        arrivalStation: train.arrivalStation || '',
        serviceType: train.serviceType || 'daily',
        departureTime: train.departureTime || '',
        totalSeats: train.totalSeats || 0
      });
      setCurrentTrain(train);
      setEditMode(true);
    } else {
      const newTrainNumber = generateUniqueTrainNumber(trains);
      setFormData({
        name: '',
        trainNumber: newTrainNumber,
        departureStation: '',
        arrivalStation: '',
        serviceType: 'daily',
        departureTime: '',
        totalSeats: 0
      });
      setCurrentTrain(null);
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.trainNumber || !formData.departureStation ||
          !formData.arrivalStation || !formData.serviceType || !formData.totalSeats) {
        setNotification({
          open: true,
          message: 'Please fill all required fields',
          severity: 'error'
        });
        return;
      }

      // Prevent duplicate train name or number
      const duplicateName = trains.find(
        t => t.name.toLowerCase() === formData.name.toLowerCase() && (!editMode || t.id !== currentTrain?.id)
      );
      const duplicateNumber = trains.find(
        t => t.trainNumber === formData.trainNumber && (!editMode || t.id !== currentTrain?.id)
      );

      if (duplicateName || duplicateNumber) {
        setNotification({
          open: true,
          message: 'Train Name or Train Number already exists.',
          severity: 'error'
        });
        return;
      }

      const trainData = {
        name: formData.name,
        trainNumber: formData.trainNumber,
        departureStation: formData.departureStation,
        arrivalStation: formData.arrivalStation,
        serviceType: formData.serviceType,
        departureTime: formData.departureTime,
        totalSeats: parseInt(formData.totalSeats, 10),
        availableSeats: parseInt(formData.totalSeats, 10)
      };

      if (editMode && currentTrain) {
        const trainRef = doc(db, "trains", currentTrain.id);
        await updateDoc(trainRef, trainData);
        setNotification({
          open: true,
          message: 'Train updated successfully',
          severity: 'success'
        });
      } else {
        await addDoc(collection(db, "trains"), trainData);
        setNotification({
          open: true,
          message: 'Train added successfully',
          severity: 'success'
        });
      }

      handleCloseDialog();
      fetchTrains();
    } catch (err) {
      console.error("Error saving train:", err);
      setNotification({
        open: true,
        message: 'Error saving train: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteTrain = async (trainId) => {
    if (window.confirm('Are you sure you want to delete this train?')) {
      try {
        await deleteDoc(doc(db, "trains", trainId));
        setNotification({
          open: true,
          message: 'Train deleted successfully',
          severity: 'success'
        });
        fetchTrains();
      } catch (err) {
        console.error("Error deleting train:", err);
        setNotification({
          open: true,
          message: 'Error deleting train: ' + err.message,
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Train Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Train
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Train Number</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Service Type</TableCell>
              <TableCell>Departure Time</TableCell>
              <TableCell>Total Seats</TableCell>
              <TableCell>Available Seats</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trains.length > 0 ? (
              trains.map(train => (
                <TableRow key={train.id}>
                  <TableCell>{train.trainNumber}</TableCell>
                  <TableCell>{train.name}</TableCell>
                  <TableCell>{train.departureStation}</TableCell>
                  <TableCell>{train.arrivalStation}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>
                    {train.serviceType || 'N/A'}
                  </TableCell>
                  <TableCell>{train.departureTime || 'N/A'}</TableCell>
                  <TableCell>{train.totalSeats}</TableCell>
                  <TableCell>{train.availableSeats || train.totalSeats}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpenDialog(train)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteTrain(train.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">No trains found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Train' : 'Add New Train'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
            <TextField
              label="Train Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Train Number"
              name="trainNumber"
              value={formData.trainNumber}
              onChange={handleInputChange}
              fullWidth
              required
              disabled
            />
            <TextField
              select
              label="From Station"
              name="departureStation"
              value={formData.departureStation}
              onChange={handleInputChange}
              fullWidth
              required
            >
              {sriLankaStations.map((station) => (
                <MenuItem key={`from-${station}`} value={station}>
                  {station}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="To Station"
              name="arrivalStation"
              value={formData.arrivalStation}
              onChange={handleInputChange}
              fullWidth
              required
            >
              {sriLankaStations.map((station) => (
                <MenuItem key={`to-${station}`} value={station}>
                  {station}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Service Type"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleInputChange}
              fullWidth
              required
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekend">Weekend</MenuItem>
            </TextField>
            <TextField
              label="Departure Time"
              name="departureTime"
              type="time"
              value={formData.departureTime}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Total Seats"
              name="totalSeats"
              type="number"
              value={formData.totalSeats}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
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
