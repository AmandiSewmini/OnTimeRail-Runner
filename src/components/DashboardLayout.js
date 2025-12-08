import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Container,
  CssBaseline
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ConfirmationNumber as TicketIcon,
  LocalShipping as CargoIcon,
  CardMembership as PassIcon,
  LocationOn as TrackingIcon,
  Feedback as ComplaintIcon,
  AccountCircle,
  Logout,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

const DrawerStyled = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Tickets', icon: <TicketIcon />, path: '/dashboard/tickets' },
  { text: 'Cargo Services', icon: <CargoIcon />, path: '/dashboard/cargo' },
  { text: 'Season Passes', icon: <PassIcon />, path: '/dashboard/passes' },
  { text: 'Track Train/Cargo', icon: <TrackingIcon />, path: '/dashboard/tracking' },
  { text: 'Complaints', icon: <ComplaintIcon />, path: '/dashboard/complaints' },
];

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Closed drawer width for sm screens and up
  const closedDrawerWidth = `calc(${theme.spacing(8)} + 1px)`; // Based on closedMixin for sm+

  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }
    // Consider if you want the desktop drawer to auto-close on resize to mobile
    // setOpen(!isMobile);
  }, [isMobile, mobileOpen]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleDrawerClose = () => {
    if (isMobile) {
      setMobileOpen(false);
    } else {
      setOpen(false);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const drawerContent = (
    <>
      <DrawerHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pl: 1 }}>
          <Typography variant="h6" noWrap component={Link} to="/dashboard"
            sx={{ textDecoration: 'none', color: 'inherit' }}>
            RAIL-RUNNER
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerClose}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const relevantOpen = isMobile ? mobileOpen : open; // Determine which open state is relevant
          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: relevantOpen ? 'initial' : 'center',
                  px: 2.5,
                }}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                selected={isActive}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: relevantOpen ? 3 : 'auto',
                    justifyContent: 'center',
                    color: isActive ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: relevantOpen ? 1 : 0,
                    color: isActive ? 'primary.main' : 'inherit',
                    '& .MuiTypography-root': {
                      fontWeight: isActive ? 600 : 400
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Fixed Toggle Button */}
      <Box
        sx={{
          position: 'fixed',
          top: theme.spacing(1.5), // Slightly adjust position if needed
          left: theme.spacing(1.5), // Slightly adjust position if needed
          zIndex: theme.zIndex.drawer + 2,
          color: theme.palette.primary.contrastText, // Ensure visibility against AppBar
        }}
      >
        <IconButton
          color="inherit"
          aria-label="toggle drawer"
          onClick={handleDrawerToggle}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      {/* AppBar */}
      <AppBarStyled position="fixed" elevation={1} color="primary">
        {/* Adjust left padding to account for fixed toggle button */}
        <Toolbar sx={{ pl: { xs: 7, sm: 8 } }}> {/* Adjusted padding */}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1 }}
          >
            Passenger Home
          </Typography>
          {/* User Profile Section */}
          <div>
             <IconButton
               size="large"
               aria-label="account of current user"
               aria-controls="menu-appbar"
               aria-haspopup="true"
               onClick={handleMenu}
               color="inherit"
             >
               <Avatar sx={{ bgcolor: 'secondary.main' }}>
                 {currentUser?.displayName ? currentUser.displayName.at(0)?.toUpperCase() : 'U'}
               </Avatar>
             </IconButton>
             <Menu
               id="menu-appbar"
               anchorEl={anchorEl}
               anchorOrigin={{
                 vertical: 'bottom',
                 horizontal: 'right',
               }}
               keepMounted
               transformOrigin={{
                 vertical: 'top',
                 horizontal: 'right',
               }}
               open={Boolean(anchorEl)}
               onClose={handleClose}
             >
               <MenuItem onClick={() => {
                 handleClose();
                 navigate('/dashboard/profile');
               }}>
                 <ListItemIcon>
                   <AccountCircle fontSize="small" />
                 </ListItemIcon>
                 Profile
               </MenuItem>
               <MenuItem onClick={handleLogout}>
                 <ListItemIcon>
                   <Logout fontSize="small" />
                 </ListItemIcon>
                 Logout
               </MenuItem>
             </Menu>
           </div>
        </Toolbar>
      </AppBarStyled>

      {/* Drawer Navigation Area */}
      <Box
        component="nav"
        // Width is handled by Drawer/DrawerStyled internally based on 'open' state
        sx={{ width: { sm: open ? drawerWidth : closedDrawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer */}
        <Drawer
          container={null}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <DrawerStyled
          variant="permanent"
          open={open} // Controls the styled open/closed state
          sx={{
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {drawerContent}
        </DrawerStyled>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // REMOVED p: 3 from here
          // Width and margin adjusted based on drawer state for sm+
          width: {
            xs: '100%', // Full width on mobile
            sm: `calc(100% - ${(open ? drawerWidth : closedDrawerWidth)})` // Dynamic width based on drawer state
          },
          marginLeft: {
             xs: 0, // No margin shift on mobile
             // No marginLeft needed here, width adjustment handles the space
          },
          transition: theme.transitions.create(['width', 'margin'], { // Transition both width and margin
            easing: open ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
            duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* AppBar Spacer */}
        <Container
          maxWidth="lg"
          sx={{
            // Apply desired padding directly to the container
            py: 3, // Vertical padding
            // Horizontal padding is handled by Container maxWidth="lg"
             mt: 0, // Removed mt: 2, AppBar spacer handles top spacing now
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
} 