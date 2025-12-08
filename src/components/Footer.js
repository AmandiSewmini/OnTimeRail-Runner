import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link as MuiLink,
  Divider,
  Stack
} from '@mui/material';
import {
  Email,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn
} from '@mui/icons-material';

const Footer = () => {
  const styles = {
    footer: {
      backgroundColor: '#34495e',
      color: 'white',
      padding: '20px 0',
      fontFamily: 'Roboto, sans-serif',
      marginTop: 'auto',
    },
    footerSection: {
      padding: '10px',
    },
    footerLink: {
      color: 'white',
      textDecoration: 'none',
      transition: 'color 0.3s ease',
    },
    footerLinkHover: {
      color: '#ff9800',
    },
    socialLinks: {
      display: 'flex',
      gap: '15px',
      listStyle: 'none',
      padding: 0,
      marginTop: '10px',
    },
    socialIcon: {
      color: 'white',
      fontSize: '1.5rem',
      transition: 'color 0.3s ease',
    },
    socialIconHover: {
      color: '#ff9800',
    },
    footerBottom: {
      marginTop: '20px',
      textAlign: 'center',
      fontSize: '0.9rem',
    },
  };

  return (
    <Box component="footer" sx={styles.footer}>
      <Container maxWidth="md">
        <Grid container spacing={4}>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={3} sx={styles.footerSection}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/login" sx={styles.footerLink} underline="hover">
                Login
              </MuiLink>
              <MuiLink component={Link} to="/register" sx={styles.footerLink} underline="hover">
                Register
              </MuiLink>
              <MuiLink component={Link} to="/admin/login" sx={styles.footerLink} underline="hover">
                Admin Portal
              </MuiLink>
            </Stack>
          </Grid>

          {/* Contact Us */}
          <Grid item xs={12} sm={6} md={3} sx={styles.footerSection}>
            <Typography variant="h6" gutterBottom>
              Contact Us
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center">
                <Email sx={{ mr: 1 }} />
                <Typography variant="body2">support@railway.com</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <Phone sx={{ mr: 1 }} />
                <Typography variant="body2">+123 456 7890</Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Follow Us */}
          <Grid item xs={12} sm={6} md={3} sx={styles.footerSection}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <Box component="ul" sx={styles.socialLinks}>
              <li>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={styles.socialIcon}>
                  <Facebook />
                </a>
              </li>
              <li>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={styles.socialIcon}>
                  <Twitter />
                </a>
              </li>
              <li>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={styles.socialIcon}>
                  <Instagram />
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={styles.socialIcon}>
                  <LinkedIn />
                </a>
              </li>
            </Box>
          </Grid>

        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" sx={styles.footerBottom}>
          &copy; {new Date().getFullYear()} Sri Lanka Railways (SLR). All rights Reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
