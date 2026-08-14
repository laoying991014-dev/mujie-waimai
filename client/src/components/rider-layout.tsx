import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bike,
  ClipboardList,
  User,
  LogOut,
} from 'lucide-react';
import Logo from './Logo';
import { useAuthStore } from '../store/auth';

const RiderLayout: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();

  const navItems = [
    { path: '/rider/hall', icon: Bike, label: '接单大厅' },
    { path: '/rider/orders', icon: ClipboardList, label: '我的订单' },
    { path: '/rider/profile', icon: User, label: '个人中心' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/rider/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Logo size="sm" showText />
        </div>
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/60">骑手配送中心</p>
          <p className="text-sm font-medium mt-1 truncate">
            {profile?.name || '加载中...'}
          </p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 移动端底部导航 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1 text-xs ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 min-w-0 overflow-auto pb-16 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default RiderLayout;
