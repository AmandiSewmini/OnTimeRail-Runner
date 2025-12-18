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
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  CardMembership,
  Check,
  Schedule,
  Payment,
  Autorenew,
  VerifiedUser,
  AttachMoney
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { auth } from '../../firebase/config';
import { 
  applyForSeasonPass, 
  getUserPasses, 
  renewSeasonPass, 
  getPassDetails,
  calculateEndDate
} from '../../firebase/seasonPassService';

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

const PASS_COST_CONFIG = {
  baseRatePerKm: 8,
  classMultipliers: { first: 1.6, second: 1.25, third: 1 },
  passTypeDurations: { monthly: 30, quarterly: 90, biannual: 180, annual: 365 },
  passTypeDiscounts: { monthly: 1, quarterly: 0.92, biannual: 0.85, annual: 0.75 },
  minCost: 1500,
};

const CLASS_LABELS = {
  first: 'First Class',
  second: 'Second Class',
  third: 'Third Class',
};

const formatCurrencyLKR = (amount = 0) =>
  `LKR ${Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDistanceKm = (from, to) => {
  if (!from || !to || from === to) return 0;
  const fromKm = STATION_DISTANCE_KM[from] ?? 0;
  const toKm = STATION_DISTANCE_KM[to] ?? 0;
  return Math.max(25, Math.abs(fromKm - toKm));
};

const calculateSeasonPassCost = (formState = {}) => {
  const { passType = 'monthly', class: travelClass = 'third', fromStation = '', toStation = '' } = formState;
  const distanceKm = getDistanceKm(fromStation, toStation);
  if (!distanceKm) return 0;

  const durationDays = PASS_COST_CONFIG.passTypeDurations[passType] ?? 30;
  const discount = PASS_COST_CONFIG.passTypeDiscounts[passType] ?? 1;
  const classMultiplier = PASS_COST_CONFIG.classMultipliers[travelClass] ?? 1;

  const baseCost =
    distanceKm *
    PASS_COST_CONFIG.baseRatePerKm *
    (durationDays / 30) *
    discount;

  const normalizedCost = Math.max(baseCost, PASS_COST_CONFIG.minCost);
  const finalCost = normalizedCost * classMultiplier;

  return Math.round(finalCost / 10) * 10;
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pass-tabpanel-${index}`}
      aria-labelledby={`pass-tab-${index}`}
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

export default function SeasonPassManagement() {
  // --- Tab state ---
  const [tabValue, setTabValue] = useState(0);
  
  // --- Current user ---
  const currentUser = auth.currentUser;
  
  // --- Application form state ---
  const [passForm, setPassForm] = useState({
    fullName: '',
    idNumber: '',
    email: currentUser?.email || '',
    phone: '',
    fromStation: '',
    toStation: '',
    passType: 'monthly',
    class: 'third',
    validFrom: new Date(),
    comments: ''
  });
  const [calculatedEndDate, setCalculatedEndDate] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(null);
  
  // --- Season passes state ---
  const [myPasses, setMyPasses] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [passesError, setPassesError] = useState('');
  
  // --- Renewal Dialog state ---
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [renewalType, setRenewalType] = useState('');
  const [renewalDate, setRenewalDate] = useState(new Date());
  const [renewalError, setRenewalError] = useState('');
  
  // --- Event Handlers ---
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Clear errors when switching tabs
    setFormError('');
    setPassesError('');
    
    // Fetch passes when going to "My Passes" tab
    if (newValue === 1 && currentUser) {
      fetchMyPasses();
    }
  };
  
  const updateCalculations = useCallback((formState) => {
    if (!formState) return;
    const endDate = calculateEndDate(formState.validFrom, formState.passType);
    setCalculatedEndDate(format(endDate, 'yyyy-MM-dd'));
    setCalculatedCost(calculateSeasonPassCost(formState));
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPassForm(prev => {
      const updated = { ...prev, [name]: value };
      updateCalculations(updated);
      return updated;
    });
  };

  const handleDateChange = (newDate) => {
    setPassForm(prev => {
      const updated = { ...prev, validFrom: newDate };
      updateCalculations(updated);
      return updated;
    });
  };
  
  // --- Submit form handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!currentUser) {
      setFormError('You must be logged in to apply for a season pass.');
      return;
    }
    
    // Validate required fields
    if (!passForm.fullName || !passForm.idNumber || !passForm.fromStation || !passForm.toStation) {
      setFormError('Please fill in all required fields.');
      return;
    }
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const result = await applyForSeasonPass(passForm, currentUser);
      console.log("Season pass application submitted:", result);
      
      setFormSuccess({
        docId: result.docRef.id
      });
      
      setFormSubmitted(true);
      
    } catch (error) {
      console.error("Error submitting season pass application:", error);
      setFormError(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };
  
  // --- Fetch user's passes ---
  const fetchMyPasses = async () => {
    if (!currentUser) {
      setPassesError('Please log in to view your season passes.');
      return;
    }
    
    setLoadingPasses(true);
    setPassesError('');
    
    try {
      const passes = await getUserPasses(currentUser.uid);
      setMyPasses(passes);
      
      if (passes.length === 0) {
        setPassesError('You don\'t have any season passes yet.');
      }
    } catch (error) {
      console.error("Error fetching season passes:", error);
      setPassesError(error.message || 'Failed to load your season passes.');
    } finally {
      setLoadingPasses(false);
    }
  };
  
  useEffect(() => {
    if (tabValue === 1 && currentUser) {
      fetchMyPasses();
    }
  }, [currentUser, tabValue]);
  
  // --- Renewal Dialog handlers ---
  const handleOpenRenewDialog = (pass) => {
    setSelectedPass(pass);
    setRenewalType(pass.passType);
    
    // Default renewal date is day after current expiry
    const currentEndDate = pass.validTo instanceof Date 
      ? pass.validTo
      : pass.validTo.toDate();
      
    const nextDay = new Date(currentEndDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setRenewalDate(nextDay);
    
    setRenewDialogOpen(true);
  };
  
  const handleCloseRenewDialog = () => {
    setRenewDialogOpen(false);
    setRenewalError('');
  };
  
  const handleRenewPass = async () => {
    if (!selectedPass || !renewalType) {
      setRenewalError('Missing required information.');
      return;
    }
    
    setRenewLoading(true);
    setRenewalError('');
    
    try {
      await renewSeasonPass(selectedPass.id, renewalType, renewalDate);
      
      // Close dialog and refresh passes
      setRenewDialogOpen(false);
      fetchMyPasses();
      
    } catch (error) {
      console.error("Error renewing pass:", error);
      setRenewalError(error.message || 'Failed to renew pass. Please try again.');
    } finally {
      setRenewLoading(false);
    }
  };
  
  // --- Helper function to format dates ---
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

  const resolvePassCost = useCallback((pass) => {
    if (!pass) return 0;
    const numericCost = Number(pass.cost);
    if (Number.isFinite(numericCost) && numericCost > 0) {
      return numericCost;
    }
    return calculateSeasonPassCost({
      passType: pass.passType || 'monthly',
      class: pass.class || 'third',
      fromStation: pass.fromStation || '',
      toStation: pass.toStation || ''
    });
  }, []);

  // --- Reset form
  const resetForm = () => {
    setPassForm({
      fullName: '',
      idNumber: '',
      email: currentUser?.email || '',
      phone: '',
      fromStation: '',
      toStation: '',
      passType: 'monthly',
      class: 'third',
      validFrom: new Date(),
      comments: ''
    });
    setFormSubmitted(false);
    setFormSuccess(null);
    setFormError('');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Season Pass Management
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Apply for Season Pass" />
          <Tab label="My Season Passes" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          {!formSubmitted ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Apply for a Season Pass
                  </Typography>
                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          name="fullName"
                          value={passForm.fullName}
                          onChange={handleFormChange}
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="ID Number"
                          name="idNumber"
                          value={passForm.idNumber}
                          onChange={handleFormChange}
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          name="email"
                          value={passForm.email}
                          onChange={handleFormChange}
                          variant="outlined"
                          type="email"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          name="phone"
                          value={passForm.phone}
                          onChange={handleFormChange}
                          variant="outlined"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>From Station</InputLabel>
                          <Select
                            label="From Station"
                            name="fromStation"
                            value={passForm.fromStation}
                            onChange={handleFormChange}
                          >
                            {sriLankaStations.map((station) => (
                              <MenuItem key={`from-${station}`} value={station}>
                                {station}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>To Station</InputLabel>
                          <Select
                            label="To Station"
                            name="toStation"
                            value={passForm.toStation}
                            onChange={handleFormChange}
                          >
                            {sriLankaStations.map((station) => (
                              <MenuItem key={`to-${station}`} value={station}>
                                {station}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Pass Type</InputLabel>
                          <Select
                            label="Pass Type"
                            name="passType"
                            value={passForm.passType}
                            onChange={handleFormChange}
                          >
                            <MenuItem value="monthly">Monthly (30 days)</MenuItem>
                            <MenuItem value="quarterly">Quarterly (90 days)</MenuItem>
                            <MenuItem value="biannual">Bi-Annual (180 days)</MenuItem>
                            <MenuItem value="annual">Annual (365 days)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Class</InputLabel>
                          <Select
                            label="Class"
                            name="class"
                            value={passForm.class}
                            onChange={handleFormChange}
                          >
                            {Object.entries(CLASS_LABELS).map(([value, label]) => (
                              <MenuItem key={value} value={value}>{label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Start Date"
                            value={passForm.validFrom}
                            onChange={handleDateChange}
                            renderInput={(params) => <TextField {...params} fullWidth required />}
                            minDate={new Date()}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="End Date"
                          variant="outlined"
                          value={calculatedEndDate}
                          InputProps={{
                            readOnly: true,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Estimated Cost"
                          variant="outlined"
                          value={formatCurrencyLKR(calculatedCost)}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Additional Comments"
                          name="comments"
                          value={passForm.comments}
                          onChange={handleFormChange}
                          multiline
                          rows={4}
                          variant="outlined"
                        />
                      </Grid>
                      {formError && (
                        <Grid item xs={12}>
                          <Alert severity="error">{formError}</Alert>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Button 
                          variant="contained" 
                          startIcon={formLoading ? <CircularProgress size={20} /> : <CardMembership />}
                          size="large"
                          type="submit"
                          fullWidth
                          disabled={formLoading}
                        >
                          {formLoading ? 'Submitting...' : 'Submit Application'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Season Pass Benefits
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoney color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Save up to 40%" 
                        secondary="Season passes offer significant discounts compared to buying individual tickets" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Check color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Guaranteed Seat" 
                        secondary="Priority seating for season pass holders" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Schedule color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Flexible Travel" 
                        secondary="Travel any time on your selected route" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Autorenew color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Easy Renewal" 
                        secondary="Simple renewal process with additional loyalty discounts" 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <VerifiedUser color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Your Season Pass Application Has Been Submitted!
              </Typography>
              <Typography variant="body1" paragraph>
                Your application is now being processed. You will receive a confirmation email within 24 hours.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button 
                  variant="contained" 
                  onClick={() => {
                    setTabValue(1); // Switch to My Passes tab
                  }}
                >
                  View My Passes
                </Button>
                <Button
                  variant="outlined"
                  onClick={resetForm}
                >
                  Apply for Another Pass
                </Button>
              </Stack>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Your Season Passes
          </Typography>
          
          {loadingPasses && (
            <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />
          )}
          
          {passesError && !loadingPasses && (
            <Alert severity={myPasses.length > 0 ? "info" : "warning"} sx={{ mt: 2 }}>
              {passesError}
            </Alert>
          )}
          
          {!loadingPasses && myPasses.length > 0 && (
            <Grid container spacing={3}>
              {myPasses.map((pass) => {
                const displayCost = resolvePassCost(pass);
                return (
                  <Grid item xs={12} md={6} key={pass.id}>
                  <Card sx={{ position: 'relative', overflow: 'visible' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" gutterBottom>
                          {pass.passType.charAt(0).toUpperCase() + pass.passType.slice(1)} Season Pass
                        </Typography>
                        <Chip 
                          label={pass.status} 
                          color={
                            pass.status === 'Active' ? 'success' :
                            pass.status === 'Pending' ? 'warning' :
                            pass.status === 'Cancelled' ? 'error' : 'default'
                          } 
                          size="small" 
                        />
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom>
                            Route: {pass.fromStation} - {pass.toStation}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Valid From
                          </Typography>
                          <Typography variant="body1">
                            {renderDate(pass.validFrom)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Valid To
                          </Typography>
                          <Typography variant="body1">
                            {renderDate(pass.validTo)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Travel Class
                          </Typography>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                            {CLASS_LABELS[pass.class] || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Cost
                          </Typography>
                          <Typography variant="body1">
                            {displayCost ? formatCurrencyLKR(displayCost) : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                    <CardActions>
                      <Button startIcon={<Payment />} variant="outlined">
                        View Details
                      </Button>
                      {(pass.status === 'Active' || pass.status === 'Expired') && (
                        <Button 
                          startIcon={<Autorenew />} 
                          color="primary" 
                          variant="contained"
                          onClick={() => handleOpenRenewDialog(pass)}
                        >
                          Renew Pass
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
          
          {!loadingPasses && myPasses.length === 0 && !passesError && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="textSecondary" paragraph>
                You don't have any active season passes.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<CardMembership />}
                onClick={() => setTabValue(0)}
              >
                Apply for a Season Pass
              </Button>
            </Box>
          )}
        </TabPanel>
      </Paper>
      
      {/* Renewal Dialog */}
      <Dialog open={renewDialogOpen} onClose={handleCloseRenewDialog}>
        <DialogTitle>Renew Season Pass</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are renewing your season pass for route: {selectedPass?.fromStation} - {selectedPass?.toStation}
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>New Pass Type</InputLabel>
                <Select
                  value={renewalType}
                  label="New Pass Type"
                  onChange={(e) => setRenewalType(e.target.value)}
                >
                  <MenuItem value="monthly">Monthly (30 days)</MenuItem>
                  <MenuItem value="quarterly">Quarterly (90 days)</MenuItem>
                  <MenuItem value="biannual">Bi-Annual (180 days)</MenuItem>
                  <MenuItem value="annual">Annual (365 days)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={renewalDate}
                  onChange={(newDate) => setRenewalDate(newDate)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  minDate={new Date()}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                Estimated Cost:{' '}
                {formatCurrencyLKR(
                  calculateSeasonPassCost({
                    passType: renewalType || selectedPass?.passType || 'monthly',
                    class: selectedPass?.class || 'third',
                    fromStation: selectedPass?.fromStation || '',
                    toStation: selectedPass?.toStation || ''
                  })
                )}
              </Typography>
            </Grid>
            {renewalError && (
              <Grid item xs={12}>
                <Alert severity="error">{renewalError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRenewDialog} disabled={renewLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleRenewPass} 
            variant="contained" 
            disabled={renewLoading}
            startIcon={renewLoading ? <CircularProgress size={20} /> : <Autorenew />}
          >
            {renewLoading ? 'Processing...' : 'Confirm Renewal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}