import api from './api';

export const analyticsService = {
  async getDashboardOverview(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get('/analytics/dashboard', { params });
    return response.data;
  },

  async getBookingAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const response = await api.get('/analytics/bookings', { params });
    return response.data;
  },

  async getRevenueAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const response = await api.get('/analytics/revenue', { params });
    return response.data;
  },

  async getUserAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get('/analytics/users', { params });
    return response.data;
  },

  async getRealTimeMetrics() {
    const response = await api.get('/analytics/realtime');
    return response.data;
  },
};
