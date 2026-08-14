import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Bike } from 'lucide-react';
import Logo from '../../../components/Logo';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { riderApi } from '../../../api/rider';
import { useAuthStore } from '../../../store/auth';

const RiderLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ account: '', password: '' });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/rider/hall';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account || !form.password) {
      toast.error('请填写账号和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await riderApi.login(form.account, form.password);
      setAuth(res.token, 'rider', res.rider);
      toast.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-600 to-red-600 flex-col items-center justify-center p-12">
        <div className="text-white">
          <Bike className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-center">木姐外卖骑手端</h1>
          <p className="mt-4 text-white/80 text-lg text-center">接单配送，轻松赚钱</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex flex-col items-center gap-2 mb-8">
            <Logo size="lg" />
            <p className="text-sm text-muted-foreground">骑手配送中心</p>
          </div>
          <h1 className="text-2xl font-bold">骑手登录</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">骑手账号</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="account"
                  placeholder="请输入骑手账号"
                  className="pl-10"
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
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
            测试账号：rider001 / 密码：rider123
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiderLoginPage;
