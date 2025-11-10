import api from './api';

export interface CreateBookingData {
  flightId: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
  }>;
  contactEmail: string;
  contactPhone: string;
}

export const bookingService = {
  async createBooking(data: CreateBookingData) {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  async getMyBookings(params?: { page?: number; limit?: number; status?: string }) {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  async getBookingById(id: string) {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  async cancelBooking(id: string) {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },

  async updateBooking(id: string, data: any) {
    const response = await api.patch(`/bookings/${id}`, data);
    return response.data;
  },
};
