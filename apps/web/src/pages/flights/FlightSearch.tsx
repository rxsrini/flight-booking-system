import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  MenuItem,
} from '@mui/material';
import { Flight, Search } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import { flightService } from '../../services/flight.service';

const validationSchema = yup.object({
  origin: yup.string().required('Origin is required'),
  destination: yup.string().required('Destination is required'),
  departureDate: yup.date().required('Departure date is required'),
  adults: yup.number().min(1).required('At least 1 adult required'),
});

export default function FlightSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const formik = useFormik({
    initialValues: {
      origin: '',
      destination: '',
      departureDate: '',
      returnDate: '',
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: 'ECONOMY',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSearching(true);
        const results = await flightService.searchFlights(values);
        setSearchResults(results);
        enqueueSnackbar(`Found ${results.length} flights`, { variant: 'success' });
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Search failed', { variant: 'error' });
      } finally {
        setIsSearching(false);
      }
    },
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Search Flights
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  id="origin"
                  name="origin"
                  label="From"
                  placeholder="JFK"
                  value={formik.values.origin}
                  onChange={formik.handleChange}
                  error={formik.touched.origin && Boolean(formik.errors.origin)}
                  helperText={formik.touched.origin && formik.errors.origin}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  id="destination"
                  name="destination"
                  label="To"
                  placeholder="LAX"
                  value={formik.values.destination}
                  onChange={formik.handleChange}
                  error={formik.touched.destination && Boolean(formik.errors.destination)}
                  helperText={formik.touched.destination && formik.errors.destination}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  id="departureDate"
                  name="departureDate"
                  label="Departure"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.departureDate}
                  onChange={formik.handleChange}
                  error={formik.touched.departureDate && Boolean(formik.errors.departureDate)}
                  helperText={formik.touched.departureDate && formik.errors.departureDate}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  id="returnDate"
                  name="returnDate"
                  label="Return (Optional)"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.returnDate}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  fullWidth
                  id="adults"
                  name="adults"
                  label="Adults"
                  type="number"
                  value={formik.values.adults}
                  onChange={formik.handleChange}
                  error={formik.touched.adults && Boolean(formik.errors.adults)}
                  helperText={formik.touched.adults && formik.errors.adults}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  fullWidth
                  id="children"
                  name="children"
                  label="Children"
                  type="number"
                  value={formik.values.children}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  fullWidth
                  select
                  id="cabinClass"
                  name="cabinClass"
                  label="Class"
                  value={formik.values.cabinClass}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="ECONOMY">Economy</MenuItem>
                  <MenuItem value="PREMIUM_ECONOMY">Premium Economy</MenuItem>
                  <MenuItem value="BUSINESS">Business</MenuItem>
                  <MenuItem value="FIRST">First</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={isSearching ? <CircularProgress size={20} color="inherit" /> : <Search />}
                  disabled={isSearching}
                >
                  Search Flights
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isSearching ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : searchResults.length > 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            Found {searchResults.length} flights
          </Typography>
          {searchResults.map((flight, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <Typography variant="h6">{flight.airline}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {flight.flightNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="h5">{flight.departureTime}</Typography>
                        <Typography variant="body2">{flight.origin}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', px: 2 }}>
                        <Flight sx={{ transform: 'rotate(90deg)' }} />
                        <Typography variant="caption" display="block">
                          {flight.duration}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h5">{flight.arrivalTime}</Typography>
                        <Typography variant="body2">{flight.destination}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="h4" color="primary" align="right">
                      ${flight.price}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 1 }}
                      onClick={() => {/* Navigate to booking */}}
                    >
                      Book Now
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Alert severity="info">
          Enter your travel details and click "Search Flights" to find available flights
        </Alert>
      )}
    </Box>
  );
}
