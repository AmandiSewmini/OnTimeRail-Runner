import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Footer from "../components/Footer";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Link as MuiLink,
  Alert,
  CircularProgress,
} from "@mui/material";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords do not match!");
    }

    try {
      setError("");
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        displayName: name,
        role: "passenger",
        createdAt: Timestamp.now(),
      });

      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Failed to create an account. " + err.message);
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
        backgroundColor: "#f4f4f9", // Soft background color for consistency with login page
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
          onSubmit={handleRegister}
          sx={{
            width: "100%",
            maxWidth: 400, // Similar width to login page
            minHeight: 550,
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
            variant="h10"
            align="center"
            gutterBottom
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Create Your Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              "& .MuiInputBase-root": { borderRadius: 2 },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              "& .MuiInputBase-root": { borderRadius: 2 },
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              "& .MuiInputBase-root": { borderRadius: 2 },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{
              "& .MuiInputBase-root": { borderRadius: 2 },
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
            {loading ? <CircularProgress size={24} color="inherit" /> : "Register"}
          </Button>

          <Grid container justifyContent="center" sx={{ mt: 2 }}>
            <Grid item>
              <MuiLink
                component={Link}
                to="/login"
                variant="body2"
                underline="hover"
                sx={{
                  fontSize: "15px",
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {"Already have an account? Sign In"}
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};

export default Register;
