import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  BarChart3,
  Bike,
} from 'lucide-react';
import Logo from './Logo';
import { useAuthStore } from '../store/auth';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: '数据概览' },
    { path: '/admin/users', icon: Users, label: '用户管理' },
    { path: '/admin/merchants', icon: Store, label: '商家管理' },
    { path: '/admin/riders', icon: Bike, label: '骑手管理' },
    { path: '/admin/products', icon: Package, label: '商品管理' },
    { path: '/admin/orders', icon: ClipboardList, label: '订单管理' },
    { path: '/admin/daily-stats', icon: BarChart3, label: '配送费统计' },
    { path: '/admin/notices', icon: Bell, label: '公告管理' },
    { path: '/admin/settings', icon: Settings, label: '网站设置' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Logo size="sm" />
        </div>
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/60">管理后台</p>
          <p className="text-sm font-medium mt-1">
            {profile?.realName || profile?.username || '管理员'}
          </p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
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

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
