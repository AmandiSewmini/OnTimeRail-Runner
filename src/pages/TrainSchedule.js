// src/pages/TrainSchedule.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import Footer from "../components/Footer";

function TrainSchedule() {
  const [trains, setTrains] = useState([]);

  useEffect(() => {
    const fetchTrains = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "trains"));
        const trainList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTrains(trainList);
      } catch (error) {
        console.error("Error loading train schedule:", error);
      }
    };

    fetchTrains();
  }, []);

  return (
    <>
      {/* ✅ Navbar is removed here to avoid duplication */}
      <div style={{ padding: "20px", minHeight: "80vh", backgroundColor: "#f9f9f9" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Train Schedule</h2>
        {trains.length === 0 ? (
          <p style={{ textAlign: "center" }}>No trains found.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Departure Station</th>
                <th style={thStyle}>Arrival Station</th>
                <th style={thStyle}>Departure Time</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((train) => (
                <tr key={train.id} style={rowStyle}>
                  <td style={tdStyle}>{train.name}</td>
                  <td style={tdStyle}>{train.departureStation}</td>
                  <td style={tdStyle}>{train.arrivalStation}</td>
                  <td style={tdStyle}>{train.departureTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Footer />
    </>
  );
}

// Styles
const tableStyle = {
  width: "80%",
  margin: "0 auto",
  borderCollapse: "collapse",
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
};

const thStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  backgroundColor: "#f0f2f5",
  color: "#333",
  textAlign: "left",
  fontSize: "14px",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "left",
  fontSize: "13px",
};

const rowStyle = {
  backgroundColor: "#fff",
  transition: "background-color 0.3s ease",
};

export default TrainSchedule;
