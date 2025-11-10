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
} from '@mui/material';
import {
  Flight,
  BookOnline,
  People,
  TrendingUp,
} from '@mui/icons-material';
import { bookingService } from '../../services/booking.service';

export default function TravelAgentDashboard() {
  const navigate = useNavigate();

  const { data: bookingsData, isLoading } = useQuery(
    'agentBookings',
    () => bookingService.getMyBookings({ limit: 10 }),
  );

  const stats = {
    totalBookings: bookingsData?.meta?.total || 0,
    thisMonth: bookingsData?.data?.filter((b: any) => {
      const bookingDate = new Date(b.createdAt);
      const now = new Date();
      return bookingDate.getMonth() === now.getMonth();
    }).length || 0,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Travel Agent Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage bookings for your customers
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">This Month</Typography>
              </Box>
              <Typography variant="h3">{stats.thisMonth}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Customers</Typography>
              </Box>
              <Typography variant="h3">-</Typography>
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
          Search Flights for Customer
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
                  <Box display="flex" justifyContent="space-between">
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
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
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
