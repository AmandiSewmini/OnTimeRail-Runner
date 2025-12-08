import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { 
  DirectionsRailway, 
  ConfirmationNumber, 
  People,
  Feedback 
} from '@mui/icons-material';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%', bgcolor: color }}>
    <CardContent>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          {icon}
        </Grid>
        <Grid item xs>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalTrains: 0,
    activeBookings: 0,
    totalUsers: 0,
    pendingComplaints: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialLoad = { trains: false, bookings: false, users: false, complaints: false };
    const markLoaded = (key) => {
      initialLoad[key] = true;
      if (Object.values(initialLoad).every(Boolean)) setLoading(false);
    };
    const handleSnapshotError = (err) => {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
      setLoading(false);
    };

    const unsubscribes = [];

    unsubscribes.push(
      onSnapshot(collection(db, 'trains'), (snapshot) => {
        setStats((prev) => ({ ...prev, totalTrains: snapshot.size }));
        markLoaded('trains');
      }, handleSnapshotError)
    );

    unsubscribes.push(
      onSnapshot(query(collection(db, 'bookings'), where('status', '==', 'Confirmed')), (snapshot) => {
        const active = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data();
          const bookingDateRaw = data.date?.toDate ? data.date.toDate() : data.date;
          if (!bookingDateRaw) return true;
          const bookingDate = new Date(bookingDateRaw);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate >= today;
        });
        setStats((prev) => ({ ...prev, activeBookings: active.length }));
        markLoaded('bookings');
      }, handleSnapshotError)
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'users'), (snapshot) => {
        const nonAdmins = snapshot.docs.filter(
          (docSnap) => (docSnap.data().role || 'passenger').toLowerCase() !== 'admin'
        );
        setStats((prev) => ({ ...prev, totalUsers: nonAdmins.length }));
        markLoaded('users');
      }, handleSnapshotError)
    );

    unsubscribes.push(
      onSnapshot(query(collection(db, 'complaints'), where('status', '==', 'Pending')), (snapshot) => {
        setStats((prev) => ({ ...prev, pendingComplaints: snapshot.size }));
        markLoaded('complaints');
      }, handleSnapshotError)
    );

    return () => unsubscribes.forEach((unsub) => unsub && unsub());
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom component="div">
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Trains" 
            value={stats.totalTrains} 
            icon={<DirectionsRailway sx={{ fontSize: 40, color: '#fff' }} />}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Bookings" 
            value={stats.activeBookings} 
            icon={<ConfirmationNumber sx={{ fontSize: 40, color: '#fff' }} />}
            color="#2e7d32"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Registered Users" 
            value={stats.totalUsers} 
            icon={<People sx={{ fontSize: 40, color: '#fff' }} />}
            color="#ed6c02"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Pending Complaints" 
            value={stats.pendingComplaints} 
            icon={<Feedback sx={{ fontSize: 40, color: '#fff' }} />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>
    </Box>
  );
}