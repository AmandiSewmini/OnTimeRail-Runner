import React from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  DirectionsRailway,
  Inventory,
  People,
  Feedback,
  CardMembership,
  Settings,
  Logout
} from '@mui/icons-material';

const drawerWidth = 240;

export default function AdminDashboard() {
  const { currentAdmin, adminLoading, logout } = useAdmin();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  
  // If still loading, show loading indicator
  if (adminLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If not logged in as admin, redirect to admin login
  if (!currentAdmin) {
    return <Navigate to="/admin/login" />;
  }
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  const menuItems = [
    { text: 'Overview', icon: <Dashboard />, path: '/admin/dashboard' },
    { text: 'Train Management', icon: <DirectionsRailway />, path: '/admin/dashboard/trains' }, // Add '/admin/dashboard/' prefix
    { text: 'Bookings', icon: <Inventory />, path: '/admin/dashboard/bookings' }, // Add '/admin/dashboard/' prefix
    // { text: 'User Management', icon: <People />, path: '/admin/dashboard/users' }, // Add '/admin/dashboard/' prefix
    { text: 'Complaints', icon: <Feedback />, path: '/admin/dashboard/complaints' }, // Add '/admin/dashboard/' prefix 
    { text: 'Season Passes', icon: <CardMembership />, path: '/admin/dashboard/passes' }, // Add '/admin/dashboard/' prefix
    // { text: 'Settings', icon: <Settings />, path: '/admin/dashboard/settings' },
  ];
  
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Admin Portal
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavClick(item.path)}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Railway System Admin
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
} 