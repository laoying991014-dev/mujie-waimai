import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import './api/axios';
import UserLayout from './components/user-layout';
import MerchantLayout from './components/merchant-layout';
import AdminLayout from './components/admin-layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import MerchantListPage from './pages/MerchantListPage/MerchantListPage';
import ShopDetailPage from './pages/ShopDetailPage/ShopDetailPage';
import CartPage from './pages/CartPage/CartPage';
import OrdersPage from './pages/OrdersPage/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage/OrderDetailPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MerchantLoginPage from './pages/merchant/MerchantLoginPage/MerchantLoginPage';
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage/MerchantDashboardPage';
import MerchantProductsPage from './pages/merchant/MerchantProductsPage/MerchantProductsPage';
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage/MerchantOrdersPage';
import MerchantSettingsPage from './pages/merchant/MerchantSettingsPage/MerchantSettingsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage/AdminUsersPage';
import AdminMerchantsPage from './pages/admin/AdminMerchantsPage/AdminMerchantsPage';
import AdminProductsPage from './pages/admin/AdminProductsPage/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage/AdminOrdersPage';
import AdminNoticesPage from './pages/admin/AdminNoticesPage/AdminNoticesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage/AdminSettingsPage';
import AdminDailyStatsPage from './pages/admin/AdminDailyStatsPage/AdminDailyStatsPage';
import RiderLoginPage from './pages/rider/RiderLoginPage/RiderLoginPage';
import RiderHallPage from './pages/rider/RiderHallPage/RiderHallPage';
import RiderOrdersPage from './pages/rider/RiderOrdersPage/RiderOrdersPage';
import RiderOrderDetailPage from './pages/rider/RiderOrderDetailPage/RiderOrderDetailPage';
import RiderProfilePage from './pages/rider/RiderProfilePage/RiderProfilePage';
import RiderLayout from './components/rider-layout';

const RoutesComponent = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handleLogout = (e: Event) => {
      const customEvent = e as CustomEvent<{ role: string }>;
      const role = customEvent.detail?.role;
      if (role === 'merchant') {
        navigate('/merchant/login', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin/login', { replace: true });
      } else if (role === 'rider') {
        navigate('/rider/login', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [navigate]);

  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route index element={<HomePage />} />
        <Route path="merchants" element={<MerchantListPage />} />
        <Route path="shop/:id" element={<ShopDetailPage />} />
        <Route
          path="cart"
          element={
            <ProtectedRoute role="user">
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute role="user">
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute role="user">
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute role="user">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="merchant/login" element={<MerchantLoginPage />} />
      <Route path="merchant" element={<MerchantLayout />}>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute role="merchant">
              <MerchantDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="products"
          element={
            <ProtectedRoute role="merchant">
              <MerchantProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute role="merchant">
              <MerchantOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute role="merchant">
              <MerchantSettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route path="rider/login" element={<RiderLoginPage />} />
      <Route path="rider" element={<RiderLayout />}>
        <Route
          path="hall"
          element={
            <ProtectedRoute role="rider">
              <RiderHallPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute role="rider">
              <RiderOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute role="rider">
              <RiderOrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute role="rider">
              <RiderProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute role="admin">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="merchants"
          element={
            <ProtectedRoute role="admin">
              <AdminMerchantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="products"
          element={
            <ProtectedRoute role="admin">
              <AdminProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute role="admin">
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="daily-stats"
          element={
            <ProtectedRoute role="admin">
              <AdminDailyStatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notices"
          element={
            <ProtectedRoute role="admin">
              <AdminNoticesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute role="admin">
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
