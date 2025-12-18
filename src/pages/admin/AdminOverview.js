import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import {
  DirectionsRailway,
  ConfirmationNumber,
  People,
  Feedback
} from '@mui/icons-material';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%', width: '100%', display: 'flex', bgcolor: color, color: '#fff', minHeight: 150 }}>
    <CardContent sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
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
        setStats((prev) => ({ ...prev, activeBookings: snapshot.size }));
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

  const statConfigs = [
    {
      key: 'trains',
      title: 'Active Trains',
      value: stats.totalTrains,
      icon: <DirectionsRailway sx={{ fontSize: 40, color: '#fff' }} />,
      color: '#1976d2'
    },
    {
      key: 'bookings',
      title: 'Active Bookings',
      value: stats.activeBookings,
      icon: <ConfirmationNumber sx={{ fontSize: 40, color: '#fff' }} />,
      color: '#2e7d32'
    },
    {
      key: 'users',
      title: 'Registered Users',
      value: stats.totalUsers,
      icon: <People sx={{ fontSize: 40, color: '#fff' }} />,
      color: '#ed6c02'
    },
    {
      key: 'complaints',
      title: 'Pending Complaints',
      value: stats.pendingComplaints,
      icon: <Feedback sx={{ fontSize: 40, color: '#fff' }} />,
      color: '#d32f2f'
    }
  ];

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

      <Box
        sx={{
          mt: 1,
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }
        }}
      >
        {statConfigs.map((stat) => (
          <Box key={stat.key} sx={{ display: 'flex', width: '100%' }}>
            <StatCard {...stat} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
