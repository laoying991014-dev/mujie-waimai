import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  ClipboardList,
  User,
  Search,
  LogIn,
} from 'lucide-react';
import Logo from './Logo';
import { useAuthStore } from '../store/auth';
import { Image } from '@client/src/components/ui/image';

const UserLayout: React.FC = () => {
  const navigate = useNavigate();
  const { token, profile } = useAuthStore();

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/orders', icon: ClipboardList, label: '订单' },
    { path: '/cart', icon: ShoppingCart, label: '购物车' },
    { path: '/profile', icon: User, label: '我的' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Logo size="sm" />
          <button
            onClick={() => navigate('/merchants')}
            className="flex-1 max-w-xs h-9 px-3 rounded-full bg-muted text-muted-foreground text-sm flex items-center gap-2 hover:bg-muted/80 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>搜索商家、商品</span>
          </button>
          {token ? (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                {profile?.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" />
              登录
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default UserLayout;
