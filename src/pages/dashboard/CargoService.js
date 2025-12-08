import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { LocalShipping, Send, Search } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { bookCargo, getUserCargos, trackCargo, cancelCargo } from '../../firebase/cargoService';
import { auth } from '../../firebase/config';

const sriLankaStations = [
  'Colombo Fort','Maradana','Galle','Kandy','Matara','Jaffna',
  'Anuradhapura','Badulla','Polonnaruwa','Kurunegala','Vavuniya','Batticaloa'
];

const STATION_DISTANCE_KM = {
  'Colombo Fort': 0,
  'Maradana': 2,
  'Galle': 116,
  'Kandy': 115,
  'Matara': 160,
  'Jaffna': 398,
  'Anuradhapura': 205,
  'Badulla': 292,
  'Polonnaruwa': 265,
  'Kurunegala': 94,
  'Vavuniya': 259,
  'Batticaloa': 314,
};

const COST_CONFIG = {
  baseRatePerKg: 150,
  distanceRatePerKm: 5,
  handlingFee: 500,
  heavySurchargeThreshold: 50,
  heavySurchargeRatePerKg: 75,
  typeMultipliers: {
    general: 1,
    fragile: 1.2,
    perishable: 1.35,
    dangerous: 1.6,
  },
};

const getDistanceKm = (from, to) => {
  if (!from || !to) return 0;
  if (from === to) return 0;
  const fromKm = STATION_DISTANCE_KM[from] ?? 0;
  const toKm = STATION_DISTANCE_KM[to] ?? 0;
  return Math.max(25, Math.abs(fromKm - toKm)); // ensure minimum chargeable distance
};

const formatCurrencyLKR = (amount = 0) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cargo-tabpanel-${index}`}
      aria-labelledby={`cargo-tab-${index}`}
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

export default function CargoService() {
  // --- Tab State ---
  const [tabValue, setTabValue] = useState(0);
  
  // --- Booking Form State ---
  const [activeStep, setActiveStep] = useState(0);
  const [bookingForm, setBookingForm] = useState({
    senderName: '',
    recipientName: '',
    from: '',
    to: '',
    shippingDate: new Date(),
    cargoType: 'general',
    weight: 10,
    specialInstructions: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // --- My Cargos State ---
  const [myCargos, setMyCargos] = useState([]);
  const [loadingMyCargos, setLoadingMyCargos] = useState(false);
  const [myCargosError, setMyCargosError] = useState('');
  
  // --- Tracking State ---
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  
  // --- Current User ---
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser?.displayName) {
      setBookingForm(prev => ({
        ...prev,
        senderName: currentUser.displayName
      }));
    }
  }, [currentUser]);

  const { weight, cargoType } = bookingForm;

  const calculateCost = useCallback(() => {
    const normalizedWeight = Math.max(1, Number(weight) || 1);
    const multiplier = COST_CONFIG.typeMultipliers[cargoType] ?? 1;
    const distanceKm = getDistanceKm(bookingForm.from, bookingForm.to);

    if (!bookingForm.from || !bookingForm.to || distanceKm === 0) {
      setEstimatedCost(0);
      return 0;
    }

    let cost =
      normalizedWeight *
      multiplier *
      (COST_CONFIG.baseRatePerKg + distanceKm * COST_CONFIG.distanceRatePerKm) +
      COST_CONFIG.handlingFee;

    if (normalizedWeight > COST_CONFIG.heavySurchargeThreshold) {
      cost +=
        (normalizedWeight - COST_CONFIG.heavySurchargeThreshold) *
        COST_CONFIG.heavySurchargeRatePerKg;
    }

    cost = Math.round(cost);
    setEstimatedCost(cost);
    return cost;
  }, [weight, cargoType, bookingForm.from, bookingForm.to]);

  useEffect(() => {
    calculateCost();
  }, [calculateCost]);
  
  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Clear previous states when switching tabs
    setBookingError('');
    setMyCargosError('');
    setTrackingError('');
    setTrackingResult(null);
    
    // Load user cargos when navigating to "My Cargo Shipments" tab
    if (newValue === 1 && currentUser) {
      fetchMyCargos();
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!bookingForm.from || !bookingForm.to || !bookingForm.senderName || !bookingForm.recipientName) {
        setBookingError('Please fill in all required fields (Sender Name, Recipient Name, From, To)');
        return;
      }
      calculateCost();
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setBookingError('');
  };

  const handleReset = () => {
    setActiveStep(0);
    setBookingForm({
      senderName: '',
      recipientName: '',
      from: '',
      to: '',
      shippingDate: new Date(),
      cargoType: 'general',
      weight: 10,
      specialInstructions: ''
    });
    setEstimatedCost(0);
    setBookingSuccess(null);
    setBookingError('');
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleWeightChange = (e, newValue) => {
    setBookingForm(prev => ({
      ...prev,
      weight: newValue
    }));
  };
  
  const handleInputWeightChange = (e) => {
    const value = Number(e.target.value);
    setBookingForm(prev => ({
      ...prev,
      weight: value
    }));
  };
  
  const handleDateChange = (newDate) => {
    setBookingForm(prev => ({
      ...prev,
      shippingDate: newDate
    }));
  };
  
  // --- Submit Booking ---
  const handleSubmitBooking = async () => {
    if (!currentUser) {
      setBookingError('You must be logged in to book cargo services.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const latestCost = estimatedCost || calculateCost();
      const result = await bookCargo(
        { ...bookingForm, cost: latestCost },
        currentUser
      );
      setBookingSuccess({ trackingNumber: result.trackingNumber });
      setActiveStep(steps.length);
    } catch (error) {
      console.error("Error in handleSubmitBooking: ", error);
      setBookingError(error.message || 'Failed to book cargo. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };
  
  // --- Fetch User's Cargo Shipments ---
  const fetchMyCargos = async () => {
    if (!currentUser) {
      setMyCargosError('Please log in to see your cargo shipments.');
      return;
    }
    
    setLoadingMyCargos(true);
    setMyCargosError('');
    
    try {
      const cargos = await getUserCargos(currentUser.uid);
      setMyCargos(cargos);
      
      if (cargos.length === 0) {
        setMyCargosError('You haven\'t booked any cargo shipments yet.');
      }
    } catch (error) {
      console.error("Error in fetchMyCargos: ", error);
      setMyCargosError(error.message || 'Failed to load your cargo shipments.');
    } finally {
      setLoadingMyCargos(false);
    }
  };
  
  // --- Track Cargo ---
  const handleTrackCargo = async () => {
    if (!trackingNumber) {
      setTrackingError('Please enter a tracking number.');
      return;
    }
    
    setLoadingTracking(true);
    setTrackingError('');
    setTrackingResult(null);
    
    try {
      const cargo = await trackCargo(trackingNumber);
      
      if (!cargo) {
        setTrackingError(`No cargo found with tracking number: ${trackingNumber}`);
      } else {
        setTrackingResult(cargo);
      }
    } catch (error) {
      console.error("Error in handleTrackCargo: ", error);
      setTrackingError(error.message || 'Failed to track cargo. Please try again.');
    } finally {
      setLoadingTracking(false);
    }
  };
  
  // --- Cancel Cargo ---
  const handleCancelCargo = async (cargoId) => {
    if (!currentUser) {
      setMyCargosError('You must be logged in to cancel a cargo shipment.');
      return;
    }
    
    try {
      await cancelCargo(cargoId);
      // Refetch cargo list to show updated status
      fetchMyCargos();
    } catch (error) {
      console.error("Error in handleCancelCargo: ", error);
      setMyCargosError(error.message || 'Failed to cancel cargo shipment.');
    }
  };
  
  // --- Format Date Helper ---
  const renderDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp instanceof Date) {
        return format(timestamp, 'yyyy-MM-dd');
      }
      // Firestore Timestamp
      return format(timestamp.toDate(), 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid Date';
    }
  };

  // --- Load initial data ---
  useEffect(() => {
    if (tabValue === 1 && currentUser) {
      fetchMyCargos();
    }
  }, [currentUser, tabValue]);

  // --- Booking Steps ---
  const steps = [
    {
      label: 'Cargo Details',
      description: `Provide details about your cargo shipment.`,
      content: (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Sender Name"
                name="senderName"
                value={bookingForm.senderName}
                onChange={handleFormChange}
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Recipient Name"
                name="recipientName"
                value={bookingForm.recipientName}
                onChange={handleFormChange}
                variant="outlined"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="From Station"
                name="from"
                value={bookingForm.from}
                onChange={handleFormChange}
                variant="outlined"
                required
              >
                {sriLankaStations.map((station) => (
                  <MenuItem key={`from-${station}`} value={station}>
                    {station}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="To Station"
                name="to"
                value={bookingForm.to}
                onChange={handleFormChange}
                variant="outlined"
                required
              >
                {sriLankaStations.map((station) => (
                  <MenuItem key={`to-${station}`} value={station}>
                    {station}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Shipping Date"
                  value={bookingForm.shippingDate}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  minDate={new Date()}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Cargo Type</InputLabel>
                <Select
                  label="Cargo Type"
                  name="cargoType"
                  value={bookingForm.cargoType}
                  onChange={handleFormChange}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="fragile">Fragile</MenuItem>
                  <MenuItem value="perishable">Perishable</MenuItem>
                  <MenuItem value="dangerous">Dangerous Goods</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Weight (kg)
                </Typography>
                <Slider
                  value={bookingForm.weight}
                  onChange={handleWeightChange}
                  valueLabelDisplay="auto"
                  step={1}
                  min={1}
                  max={100}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Weight"
                value={bookingForm.weight}
                onChange={handleInputWeightChange}
                InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Special Instructions"
                name="specialInstructions"
                value={bookingForm.specialInstructions}
                onChange={handleFormChange}
                multiline
                rows={3}
                variant="outlined"
              />
            </Grid>
            {bookingError && (
              <Grid item xs={12}>
                <Alert severity="error">{bookingError}</Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      ),
    },
    {
      label: 'Review and Confirm',
      description: 'Review your cargo information before confirming.',
      content: (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cargo Booking Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Sender</Typography>
                <Typography variant="body1">{bookingForm.senderName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Recipient</Typography>
                <Typography variant="body1">{bookingForm.recipientName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">From</Typography>
                <Typography variant="body1">{bookingForm.from}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">To</Typography>
                <Typography variant="body1">{bookingForm.to}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Date</Typography>
                <Typography variant="body1">
                  {bookingForm.shippingDate instanceof Date
                    ? bookingForm.shippingDate.toLocaleDateString()
                    : renderDate(bookingForm.shippingDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Cargo Type</Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {bookingForm.cargoType}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Weight</Typography>
                <Typography variant="body1">{bookingForm.weight} kg</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Estimated Cost</Typography>
                <Typography variant="body1">{formatCurrencyLKR(estimatedCost)}</Typography>
              </Grid>
              {bookingForm.specialInstructions && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Special Instructions</Typography>
                  <Typography variant="body1">{bookingForm.specialInstructions}</Typography>
                </Grid>
              )}
            </Grid>
            {bookingError && (
              <Alert severity="error" sx={{ mt: 2 }}>{bookingError}</Alert>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      label: 'Payment',
      description: `Complete payment to finalize your cargo booking.`,
      content: (
        <>
          <Typography paragraph>
            Payment form would go here. For demo purposes, we'll assume the payment is complete.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmitBooking}
            disabled={bookingLoading}
            startIcon={bookingLoading ? <CircularProgress size={20} /> : <Send />}
          >
            {bookingLoading ? 'Processing...' : 'Confirm and Pay'}
          </Button>
          {bookingError && (
            <Alert severity="error" sx={{ mt: 2 }}>{bookingError}</Alert>
          )}
        </>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Cargo Services
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Book Cargo Service" />
          <Tab label="My Cargo Shipments" />
          <Tab label="Track Cargo" />
        </Tabs>
        
        {/* Book Cargo Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <Box sx={{ mb: 2 }}>
                    {step.content}
                    <Box sx={{ mb: 2, mt: 2 }}>
                      <div>
                        <Button
                          disabled={activeStep === 0}
                          onClick={handleBack}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={bookingLoading}
                        >
                          {activeStep === steps.length - 1 ? 'Finish' : 'Continue'}
                        </Button>
                      </div>
                    </Box>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
          {activeStep === steps.length && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography>
                Cargo booking complete - your tracking number is <strong>{bookingSuccess?.trackingNumber}</strong>
              </Typography>
              <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                Book Another Cargo
              </Button>
            </Paper>
          )}
        </TabPanel>
        
        {/* My Cargos Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Your Cargo Shipments
          </Typography>
          
          {loadingMyCargos && (
            <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />
          )}
          
          {myCargosError && !loadingMyCargos && (
            <Alert severity={myCargos.length > 0 ? "info" : "warning"} sx={{ mt: 2 }}>
              {myCargosError}
            </Alert>
          )}
          
          {!loadingMyCargos && myCargos.length > 0 && (
            <Grid container spacing={2}>
              {myCargos.map((cargo) => (
                <Grid item xs={12} md={6} key={cargo.id}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item>
                          <LocalShipping color="primary" fontSize="large" />
                        </Grid>
                        <Grid item xs>
                          <Typography variant="h6">
                            Tracking #: {cargo.trackingNumber}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Chip 
                            label={cargo.status} 
                            color={
                              cargo.status === 'Delivered' ? 'success' :
                              cargo.status === 'Cancelled' ? 'error' :
                              'primary'
                            } 
                            size="small" 
                          />
                        </Grid>
                      </Grid>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">From</Typography>
                          <Typography variant="body1">{cargo.from}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">To</Typography>
                          <Typography variant="body1">{cargo.to}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Shipping Date</Typography>
                          <Typography variant="body1">{renderDate(cargo.shippingDate)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Cargo Type</Typography>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                            {cargo.cargoType}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Weight</Typography>
                          <Typography variant="body1">{cargo.weight} kg</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Cost</Typography>
                          <Typography variant="body1">
                            {cargo.cost ? formatCurrencyLKR(cargo.cost) : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                    {cargo.status !== 'Delivered' && cargo.status !== 'Cancelled' && (
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Button 
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={() => handleCancelCargo(cargo.id)}
                        >
                          Cancel Shipment
                        </Button>
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {!loadingMyCargos && myCargos.length === 0 && !myCargosError && (
            <Typography variant="body1" color="textSecondary" align="center">
              You haven't booked any cargo shipments yet.
            </Typography>
          )}
        </TabPanel>
        
        {/* Track Cargo Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Track Your Cargo
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={9}>
                    <TextField
                      fullWidth
                      label="Enter Tracking Number"
                      variant="outlined"
                      placeholder="e.g., CRG1234567"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button 
                      variant="contained" 
                      startIcon={loadingTracking ? <CircularProgress size={20} /> : <Search />}
                      size="large"
                      fullWidth
                      sx={{ height: '56px' }}
                      onClick={handleTrackCargo}
                      disabled={loadingTracking || !trackingNumber}
                    >
                      {loadingTracking ? 'Tracking...' : 'Track Cargo'}
                    </Button>
                  </Grid>
                </Grid>
                
                {trackingError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{trackingError}</Alert>
                )}
              </Paper>
            </Grid>
            
            {/* Tracking Result */}
            {trackingResult && (
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Tracking Details - {trackingResult.trackingNumber}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Shipment Information</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Status</Typography>
                              <Chip 
                                label={trackingResult.status} 
                                color={
                                  trackingResult.status === 'Delivered' ? 'success' :
                                  trackingResult.status === 'Cancelled' ? 'error' :
                                  'primary'
                                } 
                                size="small" 
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Created On</Typography>
                              <Typography variant="body1">{renderDate(trackingResult.createdAt)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">From</Typography>
                              <Typography variant="body1">{trackingResult.from}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">To</Typography>
                              <Typography variant="body1">{trackingResult.to}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Shipping Date</Typography>
                              <Typography variant="body1">{renderDate(trackingResult.shippingDate)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Cargo Type</Typography>
                              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {trackingResult.cargoType}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Weight</Typography>
                              <Typography variant="body1">{trackingResult.weight} kg</Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Contact Information</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Sender</Typography>
                              <Typography variant="body1">{trackingResult.senderName}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">Recipient</Typography>
                              <Typography variant="body1">{trackingResult.recipientName}</Typography>
                            </Grid>
                          </Grid>
                          {trackingResult.specialInstructions && (
                            <>
                              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                Special Instructions
                              </Typography>
                              <Typography variant="body1">
                                {trackingResult.specialInstructions}
                              </Typography>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
}