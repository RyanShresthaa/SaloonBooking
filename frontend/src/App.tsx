import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/layout/AppShell';
import AuthStack from '@/layout/authLayout';
import HomePage from '@/layout/rootLayout';
import LoginPage from '@/routes/auth/login';
import RegisterPage from '@/routes/auth/register';
import VerifyEmailPage from '@/routes/auth/verify-email';
import ForgotPasswordPage from '@/routes/auth/forgot-password';
import ResetPasswordPage from '@/routes/auth/reset-password';
import AppointmentsPage from '@/routes/dashboard/appointments/appointmentsPage';
import NewAppointmentPage from '@/routes/dashboard/appointments/newAppointment';
import EditAppointmentPage from '@/routes/dashboard/appointments/editAppointment';
import AppointmentConfirmationPage from '@/routes/dashboard/appointments/confirmation';
import DashboardPage from '@/routes/dashboard/dashboard';
import AccountPage from '@/routes/dashboard/account';
import WaitlistPage from '@/routes/dashboard/waitlist';
import ReviewsPage from '@/routes/dashboard/reviews';
import RetailPage from '@/routes/dashboard/retail';
import TemplatesPage from '@/routes/dashboard/templates';
import NotificationsPage from '@/routes/dashboard/notification';
import LogsPage from '@/routes/dashboard/log';
import StaffAdminPage from '@/routes/dashboard/staff';
import DemoPage from '@/routes/demo';
import MarketplaceBrowsePage from '@/routes/marketplace/MarketplaceBrowsePage';
import SalonProfilePage from '@/routes/marketplace/SalonProfilePage';
import MarketplaceApplyPage from '@/routes/marketplace/MarketplaceApplyPage';
import MarketplaceMyListingPage from '@/routes/marketplace/MarketplaceMyListingPage';
import AdminMarketplacePage from '@/routes/marketplace/AdminMarketplacePage';
import PlatformDashboardPage from '@/routes/platform/PlatformDashboardPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="demo" element={<DemoPage />} />
          <Route element={<AuthStack />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="retail" element={<RetailPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/new" element={<NewAppointmentPage />} />
          <Route path="appointments/confirmation/:id" element={<AppointmentConfirmationPage />} />
          <Route path="appointments/:id/edit" element={<EditAppointmentPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="staff" element={<StaffAdminPage />} />
          <Route path="marketplace/apply" element={<MarketplaceApplyPage />} />
          <Route path="marketplace/my-listing" element={<MarketplaceMyListingPage />} />
          <Route path="marketplace/:slug" element={<SalonProfilePage />} />
          <Route path="marketplace" element={<MarketplaceBrowsePage />} />
          <Route path="admin/marketplace" element={<AdminMarketplacePage />} />
          <Route path="platform" element={<PlatformDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
