import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import { Flight, CalendarToday, Person } from '@mui/icons-material';
import { bookingService } from '../../services/booking.service';
import { format } from 'date-fns';

export default function MyBookings() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery('allBookings', () =>
    bookingService.getMyBookings({ limit: 50 }),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load bookings</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Bookings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View and manage all your flight bookings
      </Typography>

      {data?.data?.length === 0 ? (
        <Alert severity="info">
          You haven't made any bookings yet. Search for flights to get started!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {data?.data?.map((booking: any) => (
            <Grid item xs={12} key={booking.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 },
                }}
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {booking.pnr}
                      </Typography>
                      <Chip
                        label={booking.status}
                        color={getStatusColor(booking.status) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h5" color="primary">
                      ${booking.totalAmount}
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Flight />
                        <Box>
                          <Typography variant="body1">
                            {booking.flight?.flightNumber} - {booking.flight?.airline?.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {booking.flight?.origin} → {booking.flight?.destination}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarToday fontSize="small" />
                        <Typography variant="body2">
                          {booking.flight?.departureDate && format(new Date(booking.flight.departureDate), 'MMM dd, yyyy')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" />
                        <Typography variant="body2">
                          {booking.passengers?.length || 0} passenger(s)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
