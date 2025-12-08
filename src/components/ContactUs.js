import React, { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Typography,
  Box,
  Paper,
  Alert,
} from "@mui/material";
import Footer from "../components/Footer";
import { db } from "../firebase/config"; // Firebase config
import { collection, addDoc, Timestamp } from "firebase/firestore";

const ContactUs = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "contactMessages"), {
        ...form,
        submittedAt: Timestamp.now()
      });
      setSubmitted(true);
      setForm({
        name: "",
        email: "",
        mobile: "",
        subject: "",
        message: "",
      });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error("Error saving message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f4f4f9",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "100%",
            maxWidth: 450,
            p: 3,
            borderRadius: 3,
            backgroundColor: "#fff",
          }}
        >
          <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600 }}>
            Contact Us
          </Typography>

          {submitted && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Message sent successfully!
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField label="Your Name" name="name" value={form.name} onChange={handleChange} fullWidth required margin="dense" />
            <TextField label="Your Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required margin="dense" />
            <TextField
              label="Your Mobile"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              fullWidth
              required
              margin="dense"
              InputProps={{
                startAdornment: <span style={{ marginRight: 8 }}>+94</span>,
              }}
            />
            <TextField
              label="Subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              select
              fullWidth
              required
              margin="dense"
            >
              <MenuItem value="">Select Complaint Subject</MenuItem>
              <MenuItem value="booking">Booking Issue</MenuItem>
              <MenuItem value="payment">Payment Problem</MenuItem>
              <MenuItem value="delay">Train Delay</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField label="Message" name="message" value={form.message} onChange={handleChange} fullWidth required multiline rows={3} margin="dense" />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                backgroundColor: "#007bff",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": { backgroundColor: "#0056b3" },
              }}
            >
              Send
            </Button>
          </form>
        </Paper>
      </Box>
      <Footer />
    </Box>
  );
};

export default ContactUs;
