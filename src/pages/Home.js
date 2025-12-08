import React from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from "@mui/material";
import {
  Train as TrainIcon,
  Schedule,
  LocalShipping,
  CardMembership,
} from "@mui/icons-material";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleBookNowClick = () => {
    if (isAuthenticated) {
      navigate("/dashboard/tickets");
    } else {
      navigate("/login", { state: { from: "/booking" } });
    }
  };

  const services = [
    {
      title: "Book Tickets",
      description: "Book train tickets quickly and securely",
      icon: <TrainIcon color="primary" />,
      link: "/booking",
    },
    {
      title: "Train Schedule",
      description: "Check the latest train schedules",
      icon: <Schedule color="primary" />,
      link: "/schedule",
    },
    {
      title: "Track Cargo",
      description: "Track your cargo shipments in real-time",
      icon: <LocalShipping color="primary" />,
      link: "/trains",
    },
    {
      title: "Season Passes",
      description: "Apply for season passes at discounted rates",
      icon: <CardMembership color="primary" />,
      link: "/tickets",
    },
  ];

  return (
    <>
      {/* Hero Section with Swiper */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "90vh",
          overflow: "hidden",
        }}
      >
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          autoplay={{ delay: 3000 }}
          pagination={{ clickable: true }}
          navigation
          loop
          modules={[Autoplay, Pagination, Navigation]}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
          }}
        >
          <SwiperSlide>
            <img
              src="/G3.jpg"
              alt="Train 1"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback.jpg";
              }}
            />
          </SwiperSlide>
          <SwiperSlide>
            <img
              src="/G3.jpg"
              alt="Train 2"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback.jpg";
              }}
            />
          </SwiperSlide>
        </Swiper>

        {/* Overlay Text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.5)",
            padding: "30px",
            borderRadius: "10px",
            textAlign: "center",
            color: "#fff",
            zIndex: 10,
          }}
        >
          <h1 style={{ fontSize: "2.5rem", marginBottom: "10px" }}>
            WELCOME ON TIME TO RAIL-RUNNER
          </h1>
          <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
            Online Advance Train Seats Reservation
          </p>
          <button
            onClick={handleBookNowClick}
            style={{
              padding: "10px 24px",
              fontSize: "1rem",
              color: "#fff",
              backgroundColor: "transparent",
              border: "2px solid #fff",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease-in-out",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#fff";
              e.currentTarget.style.color = "#002B5B";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#fff";
            }}
          >
            Book Your Seat
          </button>
        </div>
      </div>

      {/* Services Section */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Box my={6}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            Our Services
          </Typography>
          <Box
            sx={{
              my: 6,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 3,
              maxWidth: 900,
              mx: "auto",
            }}
          >
            {services.map((service, index) => (
              <Card
                key={index}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "0.3s",
                  "&:hover": { transform: "translateY(-5px)", boxShadow: 6 },
                }}
              >
                <CardActionArea
                  onClick={() =>
                    !isAuthenticated && service.link === "/booking"
                      ? navigate("/login", { state: { from: "/booking" } })
                      : navigate(service.link)
                  }
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, width: "100%" }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      {service.icon}
                      <Typography variant="h6" component="h3" ml={1}>
                        {service.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {service.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      </Container>

      <Footer />
    </>
  );
};

export default Home;
