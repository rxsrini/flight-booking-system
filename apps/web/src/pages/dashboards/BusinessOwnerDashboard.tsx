import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  People,
  BookOnline,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService } from '../../services/analytics.service';
import { format, subDays } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function BusinessOwnerDashboard() {
  const [timeRange, setTimeRange] = useState('30');

  const startDate = format(subDays(new Date(), parseInt(timeRange)), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: overview, isLoading: loadingOverview } = useQuery(
    ['dashboard-overview', startDate, endDate],
    () => analyticsService.getDashboardOverview({ startDate, endDate }),
  );

  const { data: revenueData, isLoading: loadingRevenue } = useQuery(
    ['revenue-analytics', startDate, endDate],
    () => analyticsService.getRevenueAnalytics({ startDate, endDate, groupBy: 'day' }),
  );

  const { data: bookingData, isLoading: loadingBookings } = useQuery(
    ['booking-analytics', startDate, endDate],
    () => analyticsService.getBookingAnalytics({ startDate, endDate, groupBy: 'day' }),
  );

  const { data: realtime } = useQuery(
    'realtime-metrics',
    () => analyticsService.getRealTimeMetrics(),
    { refetchInterval: 10000 } // Refetch every 10 seconds
  );

  if (loadingOverview) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Business Analytics</Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          size="small"
        >
          <ToggleButton value="7">7 Days</ToggleButton>
          <ToggleButton value="30">30 Days</ToggleButton>
          <ToggleButton value="90">90 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Revenue</Typography>
              </Box>
              <Typography variant="h4">
                ${overview?.totalRevenue?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="success.main">
                +{overview?.revenueGrowth?.toFixed(1) || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BookOnline color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Bookings</Typography>
              </Box>
              <Typography variant="h4">
                {overview?.totalBookings?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="success.main">
                +{overview?.bookingsGrowth?.toFixed(1) || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Users</Typography>
              </Box>
              <Typography variant="h4">
                {overview?.totalUsers?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="success.main">
                +{overview?.usersGrowth?.toFixed(1) || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Booking</Typography>
              </Box>
              <Typography variant="h4">
                ${overview?.averageBookingValue?.toFixed(0) || 0}
              </Typography>
              <Typography variant="body2" color="success.main">
                +{overview?.avgBookingGrowth?.toFixed(1) || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Real-time Metrics */}
      {realtime && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Last 24 Hours</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Bookings</Typography>
                    <Typography variant="h5">{realtime.last24Hours.bookings}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Revenue</Typography>
                    <Typography variant="h5">${realtime.last24Hours.revenue}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">New Users</Typography>
                    <Typography variant="h5">{realtime.last24Hours.newUsers}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Last Hour</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Bookings</Typography>
                    <Typography variant="h5">{realtime.lastHour.bookings}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Revenue</Typography>
                    <Typography variant="h5">${realtime.lastHour.revenue}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Active</Typography>
                    <Typography variant="h5">{realtime.lastHour.activeUsers}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Revenue Trend</Typography>
              {loadingRevenue ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Booking Trend</Typography>
              {loadingBookings ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bookingData?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Booking Status</Typography>
              {loadingBookings ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookingData?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(bookingData?.byStatus || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
