import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Badge,
  TextField,
  MenuItem
} from '@mui/material';
import { 
  Train, 
  Cancel, 
  EventSeat, 
  AirlineSeatReclineNormal,
  MeetingRoom,
  Close,
  ArrowForward,
  Chair,
  Download
} from '@mui/icons-material';
import { format } from 'date-fns';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { getAllAvailableTrains, getUserTickets, bookTicket, cancelTicket } from '../../firebase/ticketService';
import { QRCodeCanvas } from 'qrcode.react';

const sriLankaStations = [
  'Colombo Fort','Maradana','Galle','Kandy','Matara','Jaffna',
  'Anuradhapura','Badulla','Polonnaruwa','Kurunegala','Vavuniya','Batticaloa',
  'Kalutara','Beliatta'
];
const serviceClasses = ['3rd Class', '2nd Class', '1st Class'];

const classMultipliers = {
  '3rd Class': 1,
  '2nd Class': 1.35,
  '1st Class': 1.75,
};

const maxPassengers = 10;

const resolveServiceType = (entity = {}) => {
  const {
    serviceType,
    trainServiceType,
    scheduleType,
    frequency,
    operatingDays,
    runsDaily,
    runsOnWeekends,
    weekendOnly,
  } = entity;

  const explicit =
    serviceType || trainServiceType || scheduleType || frequency;
  if (explicit) return explicit;

  if (weekendOnly || runsOnWeekends) return 'Weekend Service';
  if (runsDaily) return 'Daily Service';

  if (Array.isArray(operatingDays) && operatingDays.length) {
    const lower = operatingDays.map((day) => day.toLowerCase());
    const weekendOnlyDays = lower.every((day) =>
      ['saturday', 'sunday'].includes(day)
    );
    if (weekendOnlyDays) return 'Weekend Service';
    if (lower.length >= 5) return 'Daily Service';
    return `${operatingDays.join(', ')} Service`;
  }

  return 'Daily Service';
};

const getServiceChipColor = (label = '') =>
  label.toLowerCase().includes('weekend') ? 'warning' : 'success';

// Custom Seat Component
const Seat = ({ 
  seatNumber, 
  isSelected, 
  isBooked, 
  onClick, 
  isWindow,
  isPriority
}) => (
  <Tooltip
    title={`Seat ${seatNumber}${isWindow ? ' (Window)' : ''}${isPriority ? ' (Priority)' : ''}`} 
    placement="top"
  >
    <IconButton
      onClick={onClick}
      disabled={isBooked}
      sx={{
        width: 40,
        height: 40,
        m: 0.5,
        bgcolor: isSelected ? 'primary.main' : 
                isBooked ? 'error.light' : 'action.selected',
        color: isSelected ? 'primary.contrastText' : 
              isBooked ? 'error.contrastText' : 'text.primary',
        '&:hover': {
          bgcolor: isSelected ? 'primary.dark' : 
                  isBooked ? 'error.main' : 'action.hover',
        },
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.dark' : 'divider',
        position: 'relative',
        ...(isWindow && {
          borderRight: '2px solid',
          borderRightColor: 'primary.dark'
        })
      }}
    >
      {isPriority && (
        <Box sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 8,
          height: 8,
          bgcolor: 'warning.main',
          borderRadius: '50%'
        }} />
      )}
      <Typography
        variant="caption"
        sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}
      >
        {seatNumber}
      </Typography>
    </IconButton>
  </Tooltip>
);

// TabPanel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ticket-tabpanel-${index}`}
      aria-labelledby={`ticket-tab-${index}`}
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

export default function TicketManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [availableTrains, setAvailableTrains] = useState([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [trainsError, setTrainsError] = useState('');

  const [myTickets, setMyTickets] = useState([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(false);
  const [myTicketsError, setMyTicketsError] = useState('');

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState({ type: '', message: '' });
  
  const [seatSelectionDialogOpen, setSeatSelectionDialogOpen] = useState(false);
  const [currentTrainForBooking, setCurrentTrainForBooking] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedClass, setSelectedClass] = useState(serviceClasses[0]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [prioritySeats, setPrioritySeats] = useState([]);
  const [qrDialog, setQrDialog] = useState({ open: false, payload: '', fileName: 'ticket-qr' });
  const qrCanvasRef = useRef(null);

  const [filters, setFilters] = useState({
    from: sriLankaStations[0],
    to: sriLankaStations[1],
  });

  const [travelDetails, setTravelDetails] = useState({ from: '', to: '' });
  const [ticketPrice, setTicketPrice] = useState(0);
  const [todayDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const getTrainRoute = (train) =>
    train?.route?.length ? train.route : [train.departureStation, train.arrivalStation];

  const doesTrainCoverRoute = (train, from, to) => {
    const route = getTrainRoute(train);
    const startIdx = route.indexOf(from);
    const endIdx = route.indexOf(to);
    return startIdx !== -1 && endIdx !== -1 && startIdx < endIdx;
  };

  const filteredTrains = useMemo(
    () =>
      availableTrains.filter((train) => doesTrainCoverRoute(train, filters.from, filters.to)),
    [availableTrains, filters]
  );

  const currentUser = auth.currentUser;

  // Date formatting function
  const renderDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp instanceof Date) {
        return format(timestamp, 'yyyy-MM-dd');
      }
      return format(timestamp.toDate(), 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error formatting date:", e, timestamp);
      return 'Invalid Date';
    }
  };

  // Time formatting function
  const renderTime = (timestampOrString) => {
    if (!timestampOrString) return 'N/A';
    if (typeof timestampOrString === 'string') {
      if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i.test(timestampOrString)) {
        return timestampOrString;
      }
      return 'N/A';
    }
    try {
      if (timestampOrString instanceof Date) {
        return format(timestampOrString, 'hh:mm a');
      }
      return format(timestampOrString.toDate(), 'hh:mm a');
    } catch (e) {
      console.error("Error formatting time:", e, timestampOrString);
      return 'Invalid Time';
    }
  };

  // Fetch available trains
  const fetchAllAvailableTrains = async () => {
    setLoadingTrains(true);
    setTrainsError('');
    setAvailableTrains([]);

    try {
      const results = await getAllAvailableTrains();
      const trainsWithPrioritySeats = results.map(train => ({
        ...train,
        prioritySeats: generatePrioritySeats(train.totalSeats)
      }));
      setAvailableTrains(trainsWithPrioritySeats);
      
      if (results.length === 0) {
        setTrainsError("No trains currently available for booking.");
      }
    } catch (error) {
      setTrainsError(error.message || "Failed to fetch available trains.");
    } finally {
      setLoadingTrains(false);
    }
  };

  // Generate priority seats (first row and window seats)
  const generatePrioritySeats = (totalSeats) => {
    const priority = [];
    const seatsPerRow = 4;
    const rows = Math.ceil(totalSeats / seatsPerRow);
    
    // First row is priority
    for (let i = 1; i <= Math.min(4, totalSeats); i++) {
      priority.push(`${1}${String.fromCharCode(64 + i)}`);
    }
    
    // Window seats are priority
    for (let row = 2; row <= rows; row++) {
      priority.push(`${row}A`);
      if (row * 4 <= totalSeats) {
        priority.push(`${row}D`);
      }
    }
    
    return priority;
  };

  // Handle book button click
  const handleBookClick = (train) => {
    if (!currentUser) {
      setBookingFeedback({ type: 'error', message: 'You must be logged in to book tickets.' });
      return;
    }

    const route = getTrainRoute(train);
    const defaultFrom = route.includes(filters.from) ? filters.from : route[0];
    const defaultTo =
      route.includes(filters.to) && route.indexOf(filters.to) > route.indexOf(defaultFrom)
        ? filters.to
        : route[route.length - 1];

    setCurrentTrainForBooking(train);
    setPassengerCount(1);
    setSelectedClass(serviceClasses[0]);
    setSelectedSeats([]);
    setBookedSeats(train.bookedSeats || []);
    setPrioritySeats(train.prioritySeats || []);
    setTravelDetails({ from: defaultFrom, to: defaultTo });
    setTicketPrice(calculateTicketPrice(train, defaultFrom, defaultTo, serviceClasses[0], 1));
    setSeatSelectionDialogOpen(true);
  };

  const computeSegmentCount = (train, from, to) => {
    const route = train?.route?.length ? train.route : [train.departureStation, train.arrivalStation];
    const startIdx = route.indexOf(from);
    const endIdx = route.indexOf(to);
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;
    return endIdx - startIdx;
  };

  const calculateTicketPrice = (train, from, to, travelClass, passengers) => {
    const segments = computeSegmentCount(train, from, to) ?? 1;
    const baseFarePerSegment = 350; // LKR per segment
    const fare =
      baseFarePerSegment *
      segments *
      (classMultipliers[travelClass] || 1) *
      passengers;
    return Math.round(fare);
  };

  // Handle seat selection
  const handleSeatSelect = (seatNumber) => {
    if (bookedSeats.includes(seatNumber)) return;
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) return prev.filter((s) => s !== seatNumber);
      if (prev.length >= passengerCount) return prev;
      return [...prev, seatNumber];
    });
  };

  // Handle passenger count change
  const handlePassengerCountChange = (value) => {
    const clampedValue = Math.min(Math.max(1, value), maxPassengers);
    setPassengerCount(clampedValue);
    setSelectedSeats((prev) => prev.slice(0, clampedValue));
  };

  const incrementPassengerCount = () =>
    handlePassengerCountChange(passengerCount + 1);

  const decrementPassengerCount = () =>
    handlePassengerCountChange(passengerCount - 1);

  // Handle ticket booking
  const handleBookTicket = async () => {
    if (!currentUser || !currentTrainForBooking || selectedSeats.length === 0) return;

    setBookingLoading(true);
    setBookingFeedback({ type: '', message: '' });

    try {
      await bookTicket(
        {
          ...currentTrainForBooking,
          trainId: currentTrainForBooking.id,
          from: travelDetails.from,
          to: travelDetails.to,
          seats: selectedSeats,
          passengerCount,
          class: selectedClass,
          price: ticketPrice,
        },
        currentUser
      );

      if (selectedSeats.length) {
        const trainDocRef = doc(db, 'trains', currentTrainForBooking.id);
        await updateDoc(trainDocRef, {
          bookedSeats: arrayUnion(...selectedSeats),
        });
      }

      setQrDialog({
        open: true,
        payload: JSON.stringify({
          train: currentTrainForBooking.name,
          from: travelDetails.from,
          to: travelDetails.to,
          seats: selectedSeats,
          passengerCount,
          class: selectedClass,
          price: ticketPrice,
          bookedAt: new Date().toISOString(),
        }),
        fileName: `${currentTrainForBooking.trainNumber || currentTrainForBooking.name}-ticket`
      });

      setAvailableTrains((prev) =>
        prev.map((train) => {
          if (train.id !== currentTrainForBooking.id) return train;
          const updatedBookedSeats = Array.from(
            new Set([...(train.bookedSeats || []), ...selectedSeats])
          );
          return { ...train, bookedSeats: updatedBookedSeats };
        })
      );
      
      setBookingFeedback({ 
        type: 'success', 
        message: `Successfully booked ticket for ${currentTrainForBooking.name}! Seats: ${selectedSeats.join(', ')}`
      });
      
      setSeatSelectionDialogOpen(false);
      if (tabValue === 1) {
        fetchMyTickets();
      }
      fetchAllAvailableTrains();
    } catch (error) {
      console.error("Error in handleBookTicket: ", error);
      setBookingFeedback({ 
        type: 'error', 
        message: error.message || 'Failed to book ticket. Please try again.' 
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Fetch user tickets
  const fetchMyTickets = async () => {
    if (!currentUser) {
      setMyTicketsError("Please log in to see your tickets.");
      return;
    }
    setLoadingMyTickets(true);
    setMyTicketsError('');
    setMyTickets([]);

    try {
      const tickets = await getUserTickets(currentUser.uid);
      setMyTickets(tickets);
      if (tickets.length === 0) {
        setMyTicketsError("You haven't booked any tickets yet.");
      }
    } catch (error) {
      console.error("Error in fetchMyTickets: ", error);
      setMyTicketsError(error.message || "Failed to load your tickets. Please try again.");
    } finally {
      setLoadingMyTickets(false);
    }
  };

  // Handle cancel ticket click
  const handleCancelTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setCancelDialogOpen(true);
  };

  // Confirm ticket cancellation
  const confirmCancelTicket = async () => {
    if (!selectedTicket) return;
    setBookingLoading(true);
    setBookingFeedback({ type: '', message: '' });

    try {
      await cancelTicket(selectedTicket.id);

      const seatsToRelease = Array.isArray(selectedTicket.seats)
        ? selectedTicket.seats
        : selectedTicket.seat
        ? [selectedTicket.seat]
        : [];
      const trainDocId = selectedTicket.trainId || selectedTicket.trainDocId;

      if (trainDocId && seatsToRelease.length) {
        const trainDocRef = doc(db, 'trains', trainDocId);
        await updateDoc(trainDocRef, {
          bookedSeats: arrayRemove(...seatsToRelease),
        });
      }

      setBookingFeedback({ type: 'success', message: 'Ticket cancelled successfully.' });
      fetchMyTickets();
      fetchAllAvailableTrains();
    } catch (error) {
      console.error("Error in confirmCancelTicket: ", error);
      setBookingFeedback({ type: 'error', message: error.message || 'Failed to cancel ticket. Please try again.' });
    } finally {
      setCancelDialogOpen(false);
      setSelectedTicket(null);
      setBookingLoading(false);
    }
  };

  const handleQrDownload = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${qrDialog.fileName}.png`;
    link.click();
  };

  useEffect(() => {
    setLoadingTrains(true);
    const trainsRef = collection(db, 'trains');
    const unsubscribe = onSnapshot(
      trainsRef,
      (snapshot) => {
        const trains = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            bookedSeats: data.bookedSeats || [],
            prioritySeats: generatePrioritySeats(data.totalSeats || 0),
          };
        });
        setAvailableTrains(trains);
        setTrainsError(trains.length ? '' : 'No trains currently available for booking.');
        setLoadingTrains(false);
      },
      (error) => {
        setTrainsError(error.message || 'Failed to fetch available trains.');
        setLoadingTrains(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Live seat listener while dialog open
  useEffect(() => {
    if (!seatSelectionDialogOpen || !currentTrainForBooking) return;
    const trainDocRef = doc(db, 'trains', currentTrainForBooking.id);
    const unsubscribe = onSnapshot(trainDocRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setBookedSeats(data.bookedSeats || []);
      setPrioritySeats(data.prioritySeats || generatePrioritySeats(data.totalSeats || 0));
      setAvailableTrains((prev) =>
        prev.map((train) =>
          train.id === docSnap.id
            ? { ...train, ...data, bookedSeats: data.bookedSeats || [], prioritySeats: generatePrioritySeats(data.totalSeats || 0) }
            : train
        )
      );
      setCurrentTrainForBooking((prev) =>
        prev && prev.id === docSnap.id ? { ...prev, ...data } : prev
      );
    });
    return () => unsubscribe();
  }, [seatSelectionDialogOpen, currentTrainForBooking]);

  useEffect(() => {
    if (!currentTrainForBooking) return;
    const liveTrain = availableTrains.find((train) => train.id === currentTrainForBooking.id);
    if (liveTrain) {
      setBookedSeats(liveTrain.bookedSeats || []);
      setPrioritySeats(liveTrain.prioritySeats || generatePrioritySeats(liveTrain.totalSeats || 0));
    }
  }, [availableTrains, currentTrainForBooking]);

  useEffect(() => {
    if (tabValue === 1 && currentUser) {
      fetchMyTickets();
    }
  }, [currentUser, tabValue]);

  useEffect(() => {
    if (!currentTrainForBooking) return;
    const price = calculateTicketPrice(
      currentTrainForBooking,
      travelDetails.from,
      travelDetails.to,
      selectedClass,
      passengerCount
    );
    setTicketPrice(price);
  }, [currentTrainForBooking, travelDetails, selectedClass, passengerCount]);

  const isRouteValid = useMemo(() => {
    if (!currentTrainForBooking) return false;
    return computeSegmentCount(currentTrainForBooking, travelDetails.from, travelDetails.to) !== null;
  }, [currentTrainForBooking, travelDetails]);

  // Render the train carriage seat layout
  const renderSeatLayout = () => {
    if (!currentTrainForBooking) return null;
    
    const totalSeats = currentTrainForBooking.totalSeats || 0;
    const seatsPerRow = 4;
    const rows = Math.ceil(totalSeats / seatsPerRow);
    const seatLetters = ['A', 'B', 'C', 'D'];
    
    return (
      <Box sx={{ 
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        maxWidth: 400,
        mx: 'auto'
      }}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="subtitle1">
            {selectedSeats.length > 0 ? `Selected: Seats ${selectedSeats.join(', ')}` : 'Select your seats'}
          </Typography>
          <Chip 
            label={`${totalSeats - bookedSeats.length} available`} 
            size="small" 
            color={(totalSeats - bookedSeats.length) > 0 ? "success" : "error"}
            icon={<EventSeat fontSize="small" />}
          />
        </Box>
        
        {/* Train Carriage Header */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          p: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          position: 'relative'
        }}>
          <Typography variant="body2">
            {currentTrainForBooking.name} - Carriage 1
          </Typography>
          <Box sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <ArrowForward sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              Front
            </Typography>
          </Box>
          <Typography variant="body2">
            #{currentTrainForBooking.trainNumber}
          </Typography>
        </Box>
        
        {/* Seat Layout */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 2
        }}>
          {/* Seats */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <Box key={`row-${rowIndex}`} sx={{ 
              display: 'flex',
              mb: 1,
              alignItems: 'center'
            }}>
              <Typography variant="caption" sx={{ 
                mr: 1,
                color: 'text.secondary',
                minWidth: 20,
                textAlign: 'center'
              }}>
                {rowIndex + 1}
              </Typography>
              
              {seatLetters.map((letter, seatIndex) => {
                const seatNumber = `${rowIndex + 1}${letter}`;
                const isWindow = seatIndex === 0 || seatIndex === 3;
                const isPriority = prioritySeats.includes(seatNumber);
                const insertAisleGap = seatIndex === 1;

                return (
                  <React.Fragment key={seatNumber}>
                    <Seat
                      seatNumber={seatNumber}
                      isSelected={selectedSeats.includes(seatNumber)}
                      isBooked={bookedSeats.includes(seatNumber)}
                      onClick={() => handleSeatSelect(seatNumber)}
                      isWindow={isWindow}
                      isPriority={isPriority}
                    />
                    {insertAisleGap && (
                      <Box sx={{ width: 20 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          ))}
        </Box>
        
        {/* Legend */}
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          mt: 3,
          gap: 1.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EventSeat color="primary" sx={{ mr: 1 }} />
            <Typography variant="caption">Available</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EventSeat color="error" sx={{ mr: 1 }} />
            <Typography variant="caption">Booked</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EventSeat sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="caption">Selected</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{
              width: 16,
              height: 16,
              borderRight: '2px solid',
              borderRightColor: 'primary.dark',
              mr: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <EventSeat fontSize="small" />
            </Box>
            <Typography variant="caption">Window</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{
              position: 'relative',
              width: 16,
              height: 16,
              mr: 1
            }}>
              <EventSeat fontSize="small" />
              <Box sx={{
                position: 'absolute',
                top: 1,
                right: 1,
                width: 6,
                height: 6,
                bgcolor: 'warning.main',
                borderRadius: '50%'
              }} />
            </Box>
            <Typography variant="caption">Priority</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Train Ticket Booking
      </Typography>

      {bookingFeedback.message && (
        <Alert severity={bookingFeedback.type} sx={{ mb: 2 }}>
          {bookingFeedback.message}
        </Alert>
      )}
      
      <Paper sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Book Tickets" icon={<Train fontSize="small" />} />
          <Tab label="My Tickets" icon={<EventSeat fontSize="small" />} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Available Trains
          </Typography>
          
          {loadingTrains && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {trainsError && !loadingTrains && (
            <Alert severity="warning" sx={{ mt: 2 }}>{trainsError}</Alert>
          )}
          
          {!loadingTrains && availableTrains.length > 0 && (
            <>
              {/* Filter Section */}
              <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField select label="From" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}>
                  {sriLankaStations.map((st) => (
                    <MenuItem key={`from-${st}`} value={st}>{st}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="To" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}>
                  {sriLankaStations.map((st) => (
                    <MenuItem key={`to-${st}`} value={st}>{st}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {filteredTrains.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredTrains.map((train) => {
                    const serviceLabel = resolveServiceType(train);
                    return (
                      <Grid item xs={12} sm={6} lg={4} key={train.id}>
                        <Card sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-4px)' }
                        }}>
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              mb: 2
                            }}>
                              <Train color="primary" sx={{ mr: 1.5 }} />
                              <Box>
                                <Typography variant="h6" noWrap>
                                  {train.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  #{train.trainNumber}
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Grid container spacing={1} sx={{ mb: 1 }}>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">From</Typography>
                                <Typography variant="body1" fontWeight="500">
                                  {train.departureStation}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">To</Typography>
                                <Typography variant="body1" fontWeight="500">
                                  {train.arrivalStation}
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Service</Typography>
                                <Chip
                                  label={serviceLabel}
                                  size="small"
                                  color={getServiceChipColor(serviceLabel)}
                                  variant="outlined"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Departure</Typography>
                                <Typography variant="body1">
                                  {renderTime(train.departureTime)}
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ 
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <Chip
                                label={`${train.totalSeats - (train.bookedSeats?.length || 0)} seats left`}
                                size="small"
                                color={(train.totalSeats - (train.bookedSeats?.length || 0)) > 0 ? "success" : "error"}
                                icon={<EventSeat fontSize="small" />}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {train.class || 'Standard Class'}
                              </Typography>
                            </Box>
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleBookClick(train)}
                              disabled={bookingLoading || (train.totalSeats - (train.bookedSeats?.length || 0)) <= 0}
                              sx={{ mb: 1, mr: 1 }}
                            >
                              Select Seats
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Alert severity="info">No trains found for the selected route.</Alert>
              )}
            </>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            My Booked Tickets
          </Typography>
          
          {loadingMyTickets && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {myTicketsError && !loadingMyTickets && (
            <Alert severity={myTickets.length > 0 ? "info" : "warning"} sx={{ mt: 2 }}>
              {myTicketsError}
            </Alert>
          )}
          
          {!loadingMyTickets && myTickets.length > 0 ? (
            <Grid container spacing={3}>
              {myTickets.map((ticket) => (
                <Grid item xs={12} sm={6} key={ticket.id}>
                  <Card sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2
                      }}>
                        <Train color="primary" sx={{ mr: 1.5 }} />
                        <Box>
                          <Typography variant="h6">
                            {ticket.trainName || 'Unknown Train'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            #{ticket.trainNumber || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">From</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {ticket.from}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">To</Typography>
                          <Typography variant="body1" fontWeight="500">
                            {ticket.to}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Service</Typography>
                          <Chip 
                            label={ticket.status} 
                            color={ticket.status === 'Cancelled' ? 'default' : 'primary'} 
                            size="small" 
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Departure</Typography>
                          <Typography variant="body1">
                            {renderTime(ticket.time)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Seat</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EventSeat color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body1">
                              {ticket.seat || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Status</Typography>
                          <Chip 
                            label={ticket.status} 
                            color={ticket.status === 'Cancelled' ? 'default' : 'primary'} 
                            size="small" 
                          />
                        </Grid>
                      </Grid>
                      
                      <Typography variant="caption" color="text.secondary">
                        Booking ID: {ticket.id} • Booked on: {renderDate(ticket.bookedAt)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <Button 
                        startIcon={<Cancel />} 
                        color="error" 
                        onClick={() => handleCancelTicketClick(ticket)}
                        disabled={bookingLoading || ticket.status === 'Cancelled'}
                        sx={{ mb: 1, mr: 1 }}
                      >
                        {ticket.status === 'Cancelled' ? 'Already Cancelled' : 'Cancel Ticket'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            !loadingMyTickets && !myTicketsError && (
              <Typography variant="body1" color="textSecondary" align="center" sx={{ mt: 4 }}>
                You haven't booked any tickets yet.
              </Typography>
            )
          )}
        </TabPanel>
      </Paper>
      
      {/* Seat Selection Dialog */}
      <Dialog
        open={seatSelectionDialogOpen}
        onClose={() => !bookingLoading && setSeatSelectionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        scroll="body"
      >
        <DialogTitle sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          Select Your Seat
          <IconButton 
            onClick={() => !bookingLoading && setSeatSelectionDialogOpen(false)}
            disabled={bookingLoading}
            color="inherit"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {currentTrainForBooking && (
            <Box>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">{currentTrainForBooking.name}</Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {travelDetails.from} to {travelDetails.to}
                </Typography>
                <Typography variant="body2">
                  {todayDate} • {renderTime(currentTrainForBooking.departureTime)}
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  select
                  label="Travel Class"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {serviceClasses.map((cls) => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Passengers"
                  value={passengerCount}
                  onChange={(e) => handlePassengerCountChange(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: maxPassengers }, (_, i) => (
                    <MenuItem key={`passenger-${i + 1}`} value={i + 1}>
                      {i + 1}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ px: 2, pb: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fare Summary
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    LKR {ticketPrice.toLocaleString('en-LK')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClass} • {passengerCount} passenger(s)
                  </Typography>
                </Paper>
              </Box>

              {renderSeatLayout()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSeatSelectionDialogOpen(false)} disabled={bookingLoading} startIcon={<Close />} >
            Cancel
          </Button>
          <Button
            onClick={handleBookTicket}
            variant="contained"
            disabled={!isRouteValid || selectedSeats.length !== passengerCount || bookingLoading}
            startIcon={bookingLoading ? <CircularProgress size={20} color="inherit" /> : <EventSeat />}
            sx={{ minWidth: 120 }}
          >
            {bookingLoading ? 'Booking...' : 'Book Seat'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancel Ticket Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !bookingLoading && setCancelDialogOpen(false)}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">Cancel Ticket Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Are you sure you want to cancel your ticket for {selectedTicket?.trainName} from {selectedTicket?.from} to {selectedTicket?.to} on {renderDate(selectedTicket?.date)}?
            <br />
            Seat: <strong>{selectedTicket?.seat}</strong>
            <br />
            This action cannot be undone.
          </DialogContentText>
          {bookingLoading && <CircularProgress sx={{ display: 'block', margin: '10px auto' }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={bookingLoading}>
            No, Keep Ticket
          </Button>
          <Button 
            onClick={confirmCancelTicket} 
            color="error" 
            disabled={bookingLoading}
            startIcon={bookingLoading ? <CircularProgress size={20} /> : null}
          >
            {bookingLoading ? 'Cancelling...' : 'Yes, Cancel Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onClose={() => setQrDialog({ open: false, payload: '', fileName: 'ticket-qr' })}>
        <DialogTitle>Booking QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <QRCodeCanvas ref={qrCanvasRef} value={qrDialog.payload} size={220} />
          <Typography variant="body2" sx={{ mt: 2 }}>{qrDialog.payload}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQrDownload} startIcon={<Download />}>
            Download QR
          </Button>
          <Button onClick={() => setQrDialog({ open: false, payload: '', fileName: 'ticket-qr' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}