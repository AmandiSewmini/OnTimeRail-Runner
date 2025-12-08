import React from "react";
import Footer from "../components/Footer";

const images = [
  "G1.jpg",
  "G2.jpg",
  "G3.jpg",
  "G4.jpg",
  "G5.jpg",
  "G6.jpg",
  "G7.jpg",
  "G8.jpg",
  "G9.jpg",
];

const styles = {
  page: {
    backgroundColor: "#f4f4f4", // ✅ Soft professional background
    minHeight: "100vh",
    paddingTop: "40px",
    paddingBottom: "40px",
  },
  container: {
    padding: "0 80px",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "30px",
    textAlign: "center",
    color: "#333", // Professional dark text
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "30px",
    justifyContent: "center",
  },
  item: {
    width: "300px",
    height: "200px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.3s ease",
    backgroundColor: "#fff", // Clean card background
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
};

const Gallery = () => {
  return (
    <>
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Gallery</h1>
        <div style={styles.grid}>
          {images.map((src, index) => (
            <div
              key={index}
              style={styles.item}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <img
                src={process.env.PUBLIC_URL + "/" + src}
                alt={`Gallery ${index + 1}`}
                style={styles.img}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Footer */}
    <Footer />
    </>
  );
};

export default Gallery;
