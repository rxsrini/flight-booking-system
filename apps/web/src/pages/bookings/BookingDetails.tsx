import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import { ArrowBack, Print, Cancel } from '@mui/icons-material';
import { bookingService } from '../../services/booking.service';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: booking, isLoading, error } = useQuery(
    ['booking', id],
    () => bookingService.getBookingById(id!),
    { enabled: !!id },
  );

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await bookingService.cancelBooking(id!);
      enqueueSnackbar('Booking cancelled successfully', { variant: 'success' });
      navigate('/bookings');
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to cancel booking', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !booking) {
    return <Alert severity="error">Failed to load booking details</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/bookings')}>
          Back to Bookings
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Booking {booking.pnr}
              </Typography>
              <Chip
                label={booking.status}
                color={
                  booking.status === 'CONFIRMED'
                    ? 'success'
                    : booking.status === 'CANCELLED'
                    ? 'error'
                    : 'warning'
                }
              />
            </Box>
            <Box>
              <Button startIcon={<Print />} sx={{ mr: 1 }}>
                Print
              </Button>
              {booking.status !== 'CANCELLED' && (
                <Button startIcon={<Cancel />} color="error" onClick={handleCancel}>
                  Cancel Booking
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Flight Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Flight Number
              </Typography>
              <Typography variant="body1">{booking.flight?.flightNumber}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Airline
              </Typography>
              <Typography variant="body1">{booking.flight?.airline?.name}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                From
              </Typography>
              <Typography variant="body1">{booking.flight?.origin}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                To
              </Typography>
              <Typography variant="body1">{booking.flight?.destination}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Departure
              </Typography>
              <Typography variant="body1">
                {booking.flight?.departureDate &&
                  format(new Date(booking.flight.departureDate), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Arrival
              </Typography>
              <Typography variant="body1">
                {booking.flight?.arrivalDate &&
                  format(new Date(booking.flight.arrivalDate), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Passengers
          </Typography>
          {booking.passengers?.map((passenger: any, index: number) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                Passenger {index + 1}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {passenger.firstName} {passenger.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Passport
                  </Typography>
                  <Typography variant="body1">{passenger.passportNumber}</Typography>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Total Amount</Typography>
            <Typography variant="h4" color="primary">
              ${booking.totalAmount}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
