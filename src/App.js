import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import TrainSchedule from "./pages/TrainSchedule";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOverview from "./pages/admin/AdminOverview";
import TrainManagement from "./pages/admin/TrainManagement";
import BookingsManagement from "./pages/admin/BookingsManagement";
import AdminComplaints from "./pages/admin/AdminComplaints";
import PassesManagement from "./pages/admin/PassesManagement";
import Gallery from "./pages/Gallery";
import ContactUs from "./components/ContactUs"; 
import Warrant from './pages/dashboard/Warrant';


// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 600,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AdminProvider>
          <Router>
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/schedule" element={<TrainSchedule />} />
              <Route path="/warrant" element={<Warrant />} />
              <Route path="/contact" element={<ContactUs />} /> {/* ✅ Added Contact Us route */}
              

              {/* Dashboard - protected */}
              <Route path="/dashboard/*" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Authentication routes */}
              <Route path="/login" element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              } />
              <Route path="/register" element={
                <AuthRedirect>
                  <Register />
                </AuthRedirect>
              } />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />}>
                <Route index element={<AdminOverview />} />
                <Route path="trains" element={<TrainManagement />} />
                <Route path="bookings" element={<BookingsManagement />} />
                {/* <Route path="users" element={<UserManagement />} /> */}
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="passes" element={<PassesManagement />} />
                {/* <Route path="settings" element={<AdminSettings />} /> */}
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Redirect authenticated users trying to access login/register
function AuthRedirect({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default App;
