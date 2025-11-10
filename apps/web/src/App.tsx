import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import TravelAgentDashboard from './pages/dashboards/TravelAgentDashboard';
import AirlineAgentDashboard from './pages/dashboards/AirlineAgentDashboard';
import BusinessOwnerDashboard from './pages/dashboards/BusinessOwnerDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import FlightSearch from './pages/flights/FlightSearch';
import BookingDetails from './pages/bookings/BookingDetails';
import MyBookings from './pages/bookings/MyBookings';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';

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
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes */}
          <Route
            path="dashboard"
            element={
              <PrivateRoute>
                <DashboardRouter />
              </PrivateRoute>
            }
          />

          <Route
            path="flights/search"
            element={
              <PrivateRoute>
                <FlightSearch />
              </PrivateRoute>
            }
          />

          <Route
            path="bookings"
            element={
              <PrivateRoute>
                <MyBookings />
              </PrivateRoute>
            }
          />

          <Route
            path="bookings/:id"
            element={
              <PrivateRoute>
                <BookingDetails />
              </PrivateRoute>
            }
          />

          <Route
            path="profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}

// Dashboard router based on user role
function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'CUSTOMER':
      return <CustomerDashboard />;
    case 'TRAVEL_AGENT':
      return <TravelAgentDashboard />;
    case 'AIRLINE_AGENT':
      return <AirlineAgentDashboard />;
    case 'BUSINESS_OWNER':
      return <BusinessOwnerDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" />;
  }
}

// Import useAuth hook
import { useAuth } from './contexts/AuthContext';

export default App;
