import React from "react";
import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav style={styles.navbar}>
      <div style={styles.logoContainer}>
        <img src="/logo.png" alt="Rail Runner Logo" style={styles.logoImg} />
        <div style={styles.logoText}>ON TIME TO RAIL-RUNNER</div>
      </div>

      <div style={styles.navSection}>
        <div style={styles.navLinks}>
          <NavLink to="/" style={getLinkStyle} end>Home</NavLink>
          <NavLink to="/gallery" style={getLinkStyle}>Gallery</NavLink>
          <NavLink to="/schedule" style={getLinkStyle}>Train Schedule</NavLink>
          <NavLink to="/warrant" style={getLinkStyle}>Warrant</NavLink>
          <NavLink to="/contact" style={getLinkStyle}>Contact</NavLink>
        </div>

        <div style={styles.authSection}>
          <span style={styles.authText}>Already have an account?</span>
          <div style={styles.authButtons}>
            <NavLink to="/login" style={styles.loginBtn}>Login</NavLink>
            <NavLink to="/register" style={styles.registerBtn}>Register</NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

const getLinkStyle = ({ isActive }) => ({
  ...styles.link,
  borderBottom: isActive ? "2px solid #007bff" : "none",
  paddingBottom: "4px",
});

const styles = {
  navbar: {
    backgroundColor: "#fff",
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    fontFamily: "Roboto, sans-serif",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoImg: {
    width: "40px",
    height: "auto",
  },
  logoText: {
    color: "#000",
    fontSize: "20px",
    fontWeight: "700",
  },
  navSection: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
    flexWrap: "wrap",
  },
  navLinks: {
    display: "flex",
    gap: "30px",
    alignItems: "center",
  },
  link: {
    color: "#000",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "500",
    transition: "color 0.3s, border-bottom 0.3s",
  },
  authSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  authText: {
    fontSize: "12px",
    color: "#555",
    fontStyle: "italic",
  },
  authButtons: {
    display: "flex",
    gap: "8px",
  },
  loginBtn: {
    color: "#007bff",
    textDecoration: "none",
    fontWeight: "500",
    padding: "6px 12px",
    border: "1px solid #007bff",
    borderRadius: "4px",
    backgroundColor: "#fff",
    transition: "background-color 0.3s, color 0.3s",
    fontFamily: "Roboto, sans-serif",
    fontSize: "13px",
  },
  registerBtn: {
    color: "#fff",
    backgroundColor: "#007bff",
    textDecoration: "none",
    fontWeight: "500",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.3s, color 0.3s",
    fontFamily: "Roboto, sans-serif",
    fontSize: "13px",
  },
};

export default Navbar;
