import api from '../axios';

export type FeatureFlags = {
  reminderEmails: boolean;
  retail: boolean;
  waitlist: boolean;
  visitFeedback: boolean;
  bulkNotify: boolean;
  publicBooking: boolean;
  stripeDeposits: boolean;
};

export const getFeatureFlags = () => api.get('/meta/features');
