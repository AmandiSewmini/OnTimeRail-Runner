import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search, 
  Train, 
  LocalShipping, 
  LocationOn,
  CheckCircle,
  PendingActions,
  ScheduleSend,
  Inventory
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { trackCargo } from '../../firebase/cargoService';

// Add this function to ticketService.js to keep our code organized
// For now, implementing it here for demonstration
const trackTrain = async (trainIdentifier) => {
  try {
    // Train identifier could be a name or number
    const trainsRef = collection(db, "trains");
    
    // Try to find by train number first
    let q = query(trainsRef, 
      where("trainNumber", "==", trainIdentifier),
      limit(1)
    );
    
    let querySnapshot = await getDocs(q);
    
    // If not found by number, try by name
    if (querySnapshot.empty) {
      q = query(trainsRef, 
        where("name", "==", trainIdentifier),
        limit(1)
      );
      querySnapshot = await getDocs(q);
    }
    
    // If still not found
    if (querySnapshot.empty) {
      return null;
    }
    
    // Get the train data
    const doc = querySnapshot.docs[0];
    const trainData = { id: doc.id, ...doc.data() };
    
    // Add tracking information (this would be from a real tracking system)
    // For demo purposes, we'll simulate some tracking data based on current time vs departure time
    const now = new Date();
    const departureTime = trainData.departureDate?.toDate() || new Date();
    
    // Calculate how far along the journey we are (0-100%)
    const journeyDurationMs = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    const elapsedMs = now.getTime() - departureTime.getTime();
    const progressPercent = Math.min(100, Math.max(0, (elapsedMs / journeyDurationMs) * 100));
    
    // Generate tracking steps based on progress
    const trackingSteps = [
      { label: `Departed ${trainData.departureStation}`, completed: progressPercent >= 0 },
      { label: 'En Route to Midpoint', completed: progressPercent >= 25 },
      { label: 'Reached Midpoint', completed: progressPercent >= 50 },
      { label: `En Route to ${trainData.arrivalStation}`, completed: progressPercent >= 75 },
      { label: `Arrived at ${trainData.arrivalStation}`, completed: progressPercent >= 100 },
    ];
    
    const statusMap = {
      0: { status: 'Scheduled', color: 'default' },
      25: { status: 'Departed', color: 'primary' },
      50: { status: 'En Route', color: 'primary' },
      75: { status: 'Approaching', color: 'info' },
      100: { status: 'Arrived', color: 'success' },
    };
    
    // Find the current status based on progress
    let currentStatus = statusMap[0];
    for (const threshold of [100, 75, 50, 25, 0]) {
      if (progressPercent >= threshold) {
        currentStatus = statusMap[threshold];
        break;
      }
    }
    
    return {
      ...trainData,
      trackingSteps,
      progressPercent,
      currentStatus
    };
    
  } catch (error) {
    console.error("Error tracking train: ", error);
    throw new Error("Failed to track train. Please check the train number and try again.");
  }
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tracking-tabpanel-${index}`}
      aria-labelledby={`tracking-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TrackingSystem() {
  const [tabValue, setTabValue] = useState(0);
  const [trainTrackingNumber, setTrainTrackingNumber] = useState('');
  const [cargoTrackingNumber, setCargoTrackingNumber] = useState('');
  
  // State for tracking results
  const [trainData, setTrainData] = useState(null);
  const [cargoData, setCargoData] = useState(null);
  
  // Loading and error states
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [loadingCargo, setLoadingCargo] = useState(false);
  const [trainError, setTrainError] = useState('');
  const [cargoError, setCargoError] = useState('');
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Clear errors when switching tabs
    setTrainError('');
    setCargoError('');
  };
  
  const handleTrainTrack = async () => {
    if (!trainTrackingNumber) {
      setTrainError('Please enter a train number or name.');
      return;
    }
    
    setLoadingTrain(true);
    setTrainError('');
    setTrainData(null);
    
    try {
      const result = await trackTrain(trainTrackingNumber);
      
      if (!result) {
        setTrainError(`No train found with number or name: ${trainTrackingNumber}`);
      } else {
        setTrainData(result);
      }
    } catch (error) {
      console.error("Error in handleTrainTrack: ", error);
      setTrainError(error.message || 'Failed to track train. Please try again.');
    } finally {
      setLoadingTrain(false);
    }
  };
  
  const handleCargoTrack = async () => {
    if (!cargoTrackingNumber) {
      setCargoError('Please enter a cargo tracking number.');
      return;
    }
    
    setLoadingCargo(true);
    setCargoError('');
    setCargoData(null);
    
    try {
      const result = await trackCargo(cargoTrackingNumber);
      
      if (!result) {
        setCargoError(`No cargo found with tracking number: ${cargoTrackingNumber}`);
      } else {
        setCargoData(result);
      }
    } catch (error) {
      console.error("Error in handleCargoTrack: ", error);
      setCargoError(error.message || 'Failed to track cargo. Please try again.');
    } finally {
      setLoadingCargo(false);
    }
  };

  // Helper function to format dates from Firestore
  const renderDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp instanceof Date) {
        return format(timestamp, 'MMMM dd, yyyy - h:mm a');
      }
      // Firestore Timestamp
      return format(timestamp.toDate(), 'MMMM dd, yyyy - h:mm a');
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid Date';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Track Train & Cargo
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Track Train" icon={<Train />} />
          <Tab label="Track Cargo" icon={<LocalShipping />} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Track Your Train
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Train Number or Name"
                      variant="outlined"
                      placeholder="e.g., Udarata Manike or 1082"
                      value={trainTrackingNumber}
                      onChange={(e) => setTrainTrackingNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button 
                      variant="contained" 
                      startIcon={loadingTrain ? <CircularProgress size={20} /> : <Search />}
                      size="large"
                      fullWidth
                      onClick={handleTrainTrack}
                      sx={{ height: '56px' }}
                      disabled={loadingTrain || !trainTrackingNumber}
                    >
                      {loadingTrain ? 'Tracking...' : 'Track Train'}
                    </Button>
                  </Grid>
                </Grid>
                
                {trainError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{trainError}</Alert>
                )}
              </Paper>
            </Grid>
            
            {trainData && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Train fontSize="large" color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">
                          {trainData.name} (Train #{trainData.trainNumber})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {trainData.departureStation} - {trainData.arrivalStation}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Chip 
                          label={trainData.currentStatus.status} 
                          color={trainData.currentStatus.color} 
                          size="small" 
                        />
                      </Box>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Current Progress: {Math.round(trainData.progressPercent)}%
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Stepper activeStep={trainData.trackingSteps.filter(step => step.completed).length} alternativeLabel>
                        {trainData.trackingSteps.map((step, index) => (
                          <Step key={index} completed={step.completed}>
                            <StepLabel>{step.label}</StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Departure
                          </Typography>
                          <Typography variant="body1">
                            {trainData.departureStation}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {trainData.departureDate ? 
                              `Scheduled at ${renderDate(trainData.departureDate)}` : 
                              'Departure time not available'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Arrival (Expected)
                          </Typography>
                          <Typography variant="body1">
                            {trainData.arrivalStation}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {trainData.arrivalTime ? 
                              `Expected at ${renderDate(trainData.arrivalTime)}` : 
                              'Estimated arrival time not available'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Track Your Cargo
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Cargo Tracking Number"
                      variant="outlined"
                      placeholder="e.g., CRG1234567"
                      value={cargoTrackingNumber}
                      onChange={(e) => setCargoTrackingNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button 
                      variant="contained" 
                      startIcon={loadingCargo ? <CircularProgress size={20} /> : <Search />}
                      size="large"
                      fullWidth
                      onClick={handleCargoTrack}
                      sx={{ height: '56px' }}
                      disabled={loadingCargo || !cargoTrackingNumber}
                    >
                      {loadingCargo ? 'Tracking...' : 'Track Cargo'}
                    </Button>
                  </Grid>
                </Grid>
                
                {cargoError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{cargoError}</Alert>
                )}
              </Paper>
            </Grid>
            
            {cargoData && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LocalShipping fontSize="large" color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h6">
                          Tracking Number: {cargoData.trackingNumber}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {cargoData.from} to {cargoData.to}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Chip 
                          label={cargoData.status} 
                          color={
                            cargoData.status === 'Delivered' ? 'success' :
                            cargoData.status === 'Cancelled' ? 'error' :
                            cargoData.status === 'In Transit' ? 'primary' :
                            'default'
                          } 
                          size="small" 
                        />
                      </Box>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Shipment Progress
                    </Typography>
                    
                    <List>
                      {/* Generate steps based on cargo status */}
                      {[
                        { label: 'Package Received', icon: <Inventory />, status: 'Pending', date: renderDate(cargoData.createdAt) },
                        { label: 'Processing at Origin', icon: <PendingActions />, status: 'Pending', date: '' },
                        { label: 'In Transit', icon: <ScheduleSend />, status: 'In Transit', date: '' },
                        { label: 'Arrived at Destination', icon: <LocationOn />, status: 'Delivered', date: '' },
                        { label: 'Ready for Pickup', icon: <CheckCircle />, status: 'Delivered', date: '' }
                      ].map((step, index) => {
                        // Determine if step is completed based on status
                        const isCompleted = 
                          (step.status === 'Pending' && ['Pending', 'In Transit', 'Delivered'].includes(cargoData.status)) ||
                          (step.status === 'In Transit' && ['In Transit', 'Delivered'].includes(cargoData.status)) ||
                          (step.status === 'Delivered' && cargoData.status === 'Delivered');
                        
                        return (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {step.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={step.label} 
                              secondary={index === 0 ? step.date : ''} 
                          />
                            {isCompleted && (
                            <Chip 
                              label="Completed" 
                              size="small" 
                              color="success" 
                              variant="outlined" 
                            />
                          )}
                        </ListItem>
                        );
                      })}
                    </List>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Shipment Details
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Sender</Typography>
                          <Typography variant="body1">{cargoData.senderName || 'Not Available'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Recipient</Typography>
                          <Typography variant="body1">{cargoData.recipientName || 'Not Available'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Shipping Date</Typography>
                          <Typography variant="body1">{renderDate(cargoData.shippingDate)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Cargo Type</Typography>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                            {cargoData.cargoType || 'Standard'}
                      </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
} 