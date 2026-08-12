import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';
import Logo from '../../../components/Logo';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { auth } from '../../../api';
import { useAuthStore } from '../../../store/auth';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('请填写用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.loginAdmin(form.username, form.password);
      setAuth(res.token, 'admin', res.admin);
      toast.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(20_15%_12%)] p-6">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <Logo size="md" />
          <p className="text-sm text-muted-foreground">管理后台</p>
        </div>
        <h1 className="text-xl font-bold text-center">管理员登录</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="请输入用户名"
                className="pl-10"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                className="pl-10 pr-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
        <div className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">
            返回首页
          </Link>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          默认账号：admin / 密码：000888
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
