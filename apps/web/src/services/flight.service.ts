import api from './api';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
}

export const flightService = {
  async searchFlights(params: FlightSearchParams) {
    const response = await api.get('/flights/search', { params });
    return response.data;
  },

  async getFlightById(id: string) {
    const response = await api.get(`/flights/${id}`);
    return response.data;
  },

  async getAirlines() {
    const response = await api.get('/flights/airlines');
    return response.data;
  },

  async getAirports(search?: string) {
    const response = await api.get('/flights/airports', {
      params: search ? { search } : {},
    });
    return response.data;
  },
};
