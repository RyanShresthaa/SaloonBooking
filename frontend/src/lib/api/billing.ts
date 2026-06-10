import api from '../axios';

export const createDepositCheckout = (appointmentId: string) =>
  api.post('/billing/deposit-checkout', { appointmentId });
