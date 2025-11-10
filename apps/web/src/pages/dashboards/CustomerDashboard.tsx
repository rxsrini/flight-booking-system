import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Flight,
  BookOnline,
  Pending,
  CheckCircle,
} from '@mui/icons-material';
import { bookingService } from '../../services/booking.service';

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const { data: bookingsData, isLoading, error } = useQuery(
    'myBookings',
    () => bookingService.getMyBookings({ limit: 5 }),
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const stats = {
    totalBookings: bookingsData?.meta?.total || 0,
    confirmedBookings: bookingsData?.data?.filter((b: any) => b.status === 'CONFIRMED').length || 0,
    pendingBookings: bookingsData?.data?.filter((b: any) => b.status === 'PENDING').length || 0,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome Back!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your flight bookings and explore new destinations
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BookOnline color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Bookings</Typography>
              </Box>
              <Typography variant="h3">{stats.totalBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Confirmed</Typography>
              </Box>
              <Typography variant="h3">{stats.confirmedBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Pending color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending</Typography>
              </Box>
              <Typography variant="h3">{stats.pendingBookings}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Flight />}
          onClick={() => navigate('/flights/search')}
        >
          Search Flights
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Bookings
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">Failed to load bookings</Alert>
          ) : bookingsData?.data?.length === 0 ? (
            <Alert severity="info">
              No bookings yet. Start by searching for flights!
            </Alert>
          ) : (
            <Box>
              {bookingsData?.data?.map((booking: any) => (
                <Box
                  key={booking.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {booking.pnr}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.flight?.origin} → {booking.flight?.destination}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: booking.status === 'CONFIRMED' ? 'success.light' : 'warning.light',
                        color: booking.status === 'CONFIRMED' ? 'success.dark' : 'warning.dark',
                      }}
                    >
                      {booking.status}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
