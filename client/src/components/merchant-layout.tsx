import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Settings, LogOut, BadgeCheck } from 'lucide-react';
import Logo from './Logo';
import { useAuthStore } from '../store/auth';

const MerchantLayout: React.FC = () => {
  const navigate = useNavigate(); const { profile, logout } = useAuthStore();
  const navItems = [
    { path: '/merchant/dashboard', icon: LayoutDashboard, label: '工作台' },
    { path: '/merchant/products', icon: Package, label: '商品管理' },
    { path: '/merchant/orders', icon: ClipboardList, label: '订单管理' },
    { path: '/merchant/payment-review', icon: BadgeCheck, label: '付款核实' },
    { path: '/merchant/settings', icon: Settings, label: '店铺设置' },
  ];
  return <div className="min-h-screen bg-background flex"><aside className="hidden lg:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"><div className="h-16 flex items-center px-5 border-b border-sidebar-border"><Logo size="sm" showText /></div><div className="px-4 py-3 border-b border-sidebar-border"><p className="text-sm text-sidebar-foreground/60">商家管理中心</p><p className="text-sm font-medium mt-1 truncate">{profile?.shopName || '加载中...'}</p></div><nav className="flex-1 py-4 space-y-1 px-3">{navItems.map(({ path, icon: Icon, label }) => <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon className="w-5 h-5" />{label}</NavLink>)}</nav><div className="p-3 border-t border-sidebar-border"><button onClick={() => { logout(); navigate('/merchant/login', { replace: true }); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="w-5 h-5" />退出登录</button></div></aside><main className="flex-1 min-w-0 overflow-auto"><Outlet /></main></div>;
};
export default MerchantLayout;
