import api from './api';

export interface PaymentData {
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export const paymentService = {
  async createPayment(data: PaymentData) {
    const response = await api.post('/payments', data);
    return response.data;
  },

  async getPaymentById(id: string) {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  async requestRefund(paymentId: string, amount?: number) {
    const response = await api.post(`/payments/${paymentId}/refund`, {
      amount,
    });
    return response.data;
  },
};
