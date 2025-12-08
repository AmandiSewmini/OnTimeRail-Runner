import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Train,
  LocalShipping,
  CardMembership,
  Feedback,
  Notifications,
  TrendingUp,
  Info,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserTickets } from '../../firebase/ticketService';
import { getUserComplaints } from '../../firebase/complaintService';
import { getUserPasses } from '../../firebase/seasonPassService';
import { format, differenceInDays } from 'date-fns';
import { db } from '../../firebase/config';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';

export default function DashboardIndex() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // States for notifications
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  
  // States for train updates
  const [trainUpdates, setTrainUpdates] = useState([]);
  const [loadingTrainUpdates, setLoadingTrainUpdates] = useState(false);
  const [trainUpdatesError, setTrainUpdatesError] = useState('');
  
  // Get current date in a readable format
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Quick access buttons
  const quickAccess = [
    { title: 'Book a Ticket', icon: <Train />, path: '/dashboard/tickets' },
    { title: 'Ship Cargo', icon: <LocalShipping />, path: '/dashboard/cargo' },
    { title: 'Apply for Pass', icon: <CardMembership />, path: '/dashboard/passes' },
    { title: 'Submit Complaint', icon: <Feedback />, path: '/dashboard/complaints' },
  ];

  // Format Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), 'yyyy-MM-dd');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  // Format time from Firestore timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return format(timestamp.toDate(), 'hh:mm a');
    } catch (e) {
      return 'Invalid Time';
    }
  };

  // Generate and fetch user notifications
  const generateNotifications = async () => {
    if (!currentUser) return;
    
    setLoadingNotifications(true);
    setNotificationsError('');
    
    try {
      const userNotifications = [];
      const today = new Date();
      
      // Check season passes for expiring soon
      const passes = await getUserPasses(currentUser.uid);
      passes.forEach(pass => {
        const expiryDate = pass.validTo.toDate();
        const daysRemaining = differenceInDays(expiryDate, today);
        
        if (daysRemaining <= 14 && daysRemaining > 0) {
          userNotifications.push({
            id: `pass-${pass.id}`,
            type: 'info',
            message: `Your season pass will expire in ${daysRemaining} days.`,
            date: format(today, 'yyyy-MM-dd'),
            link: '/dashboard/passes'
          });
        }
      });
      
      // Check complaints that were recently resolved
      const complaints = await getUserComplaints(currentUser.uid);
      complaints.forEach(complaint => {
        if (complaint.status === 'Resolved' && complaint.resolvedAt) {
          const resolvedDate = complaint.resolvedAt.toDate();
          const daysSinceResolved = differenceInDays(today, resolvedDate);
          
          if (daysSinceResolved <= 7) {
            userNotifications.push({
              id: `complaint-${complaint.id}`,
              type: 'success',
              message: `Your complaint "${complaint.subject}" has been resolved.`,
              date: formatDate(complaint.resolvedAt),
              link: '/dashboard/complaints'
            });
          }
        }
      });
      
      // Sort notifications by date (newest first)
      userNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Error generating notifications:", error);
      setNotificationsError("Couldn't load your notifications");
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  // Fetch latest train updates
  const fetchTrainUpdates = async () => {
    setLoadingTrainUpdates(true);
    setTrainUpdatesError('');
    
    try {
      // Query trains collection for the most recent/active trains
      const trainsRef = collection(db, "trains");
      const q = query(trainsRef, orderBy("departureTime", "desc"), limit(3));
      const querySnapshot = await getDocs(q);
      
      const trains = [];
      querySnapshot.forEach(doc => {
        const train = doc.data();
        
        // Determine train status
        let status = 'On time';
        let statusColor = 'success';
        
        // If you have delay information in the train documents:
        if (train.delay) {
          if (train.delay <= 15) {
            status = `Delayed by ${train.delay} mins`;
            statusColor = 'warning';
          } else {
            status = `Delayed by ${train.delay} mins`;
            statusColor = 'error';
          }
        }
        
        trains.push({
          id: doc.id,
          name: train.trainName,
          status: status,
          statusColor: statusColor
        });
      });
      
      setTrainUpdates(trains);
    } catch (error) {
      console.error("Error fetching train updates:", error);
      setTrainUpdatesError("Couldn't load train updates");
    } finally {
      setLoadingTrainUpdates(false);
    }
  };

  // Helper function to render notification icon based on type
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'info':
        return <Info color="primary" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Notifications color="action" />;
    }
  };
  
  // Load data when component mounts
  useEffect(() => {
    if (currentUser) {
      generateNotifications();
      fetchTrainUpdates();
    }
  }, [currentUser]);

  return (
    <React.Fragment>
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {currentUser?.displayName || 'Passenger'}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Today is {currentDate}
        </Typography>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Quick Access Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickAccess.map((action, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Card sx={{ textAlign: 'center', cursor: 'pointer', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: (theme) => theme.shadows[6] } }}>
                  <CardContent onClick={() => navigate(action.path)}>
                    <Box sx={{ mb: 2 }}>
                      {React.cloneElement(action.icon, { fontSize: 'large', color: 'primary' })}
                    </Box>
                    <Typography variant="subtitle1">
                      {action.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
        
        {/* Notifications */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            
            {loadingNotifications && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {notificationsError && !loadingNotifications && (
              <Alert severity="error" sx={{ my: 2 }}>{notificationsError}</Alert>
            )}
            
            {!loadingNotifications && !notificationsError && notifications.length > 0 ? (
              <List disablePadding>
                {notifications.map((notification) => (
                  <ListItem 
                    key={notification.id} 
                    sx={{ mb: 1, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}
                    button={!!notification.link}
                    onClick={() => notification.link && navigate(notification.link)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={notification.message}
                      secondary={notification.date}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              !loadingNotifications && !notificationsError && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    You don't have any notifications.
                  </Typography>
                </Box>
              )
            )}
          </Paper>
        </Grid>
        
        {/* Current Train Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Latest Train Updates
              </Typography>
              <Chip 
                icon={<TrendingUp />} 
                label="Live" 
                color="success" 
                size="small" 
                variant="outlined" 
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {loadingTrainUpdates && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {trainUpdatesError && !loadingTrainUpdates && (
              <Alert severity="error" sx={{ my: 2 }}>{trainUpdatesError}</Alert>
            )}
            
            {!loadingTrainUpdates && !trainUpdatesError && trainUpdates.length > 0 ? (
              <Grid container spacing={2}>
                {trainUpdates.map((train) => (
                  <Grid item xs={12} md={4} key={train.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item>
                            <Avatar 
                              sx={{ 
                                bgcolor: `${train.statusColor}.light`, 
                                color: `${train.statusColor}.dark` 
                              }}
                            >
                              <Train fontSize="small"/>
                            </Avatar>
                          </Grid>
                          <Grid item xs>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {train.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {train.status}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              !loadingTrainUpdates && !trainUpdatesError && (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 3 }}>
                  No train updates available.
                </Typography>
              )
            )}
            
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button 
                variant="text" 
                onClick={() => navigate('/dashboard/tracking')}
              >
                Track Your Train
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}