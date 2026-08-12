import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import type { AuthRole } from '../store/auth';

interface ProtectedRouteProps {
  role?: AuthRole;
  children: React.ReactNode;
}

const loginPathMap: Record<AuthRole, string> = {
  user: '/login',
  merchant: '/merchant/login',
  admin: '/admin/login',
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role = 'user', children }) => {
  const { token, role: userRole } = useAuthStore();
  const location = useLocation();

  if (!token || userRole !== role) {
    return <Navigate to={loginPathMap[role]} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
