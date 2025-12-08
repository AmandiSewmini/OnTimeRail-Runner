import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import Footer from "../components/Footer";
import {
  TextField,
  Button,
  Link as MuiLink,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f4f4f9", // Lighter background color for a soft look
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
        }}
      >
        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            width: "100%",
            maxWidth: 400, // Slightly wider width for a more spacious form
            minHeight: 500,
            px: 4,
            backgroundColor: "#fff",
            borderRadius: 4,
            boxShadow: 3,
            py: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography
            component="h2"
            variant="h10" // Larger and more prominent heading
            align="center"
            gutterBottom
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Login to Your Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: 2,
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              borderRadius: 3,
              backgroundColor: "#007bff",
              fontWeight: "600",
              fontSize: "16px",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#0056b3",
              },
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              mt: 2,
            }}
          >
            <MuiLink
              component={Link}
              to="/register"
              variant="body2"
              underline="hover"
              sx={{
                fontSize: "15px",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {"Don't have an account? Sign Up"}
            </MuiLink>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};

export default Login;
