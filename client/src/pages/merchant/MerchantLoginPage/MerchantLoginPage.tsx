import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import Logo from '../../../components/Logo';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { auth } from '../../../api';
import { useAuthStore } from '../../../store/auth';

const MerchantLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ account: '', password: '' });

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/merchant/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account || !form.password) {
      toast.error('请填写账号和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.loginMerchant(form.account, form.password);
      setAuth(res.token, 'merchant', res.merchant);
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
      <div className="hidden md:flex md:w-1/2 bg-[hsl(20_15%_12%)] flex-col items-center justify-center p-12">
        <Logo size="lg" />
        <p className="mt-4 text-white/80 text-lg">商家管理中心</p>
        <p className="mt-2 text-white/50 text-sm">高效管理您的店铺</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex flex-col items-center gap-2 mb-8">
            <Logo size="lg" />
            <p className="text-sm text-muted-foreground">商家管理中心</p>
          </div>
          <h1 className="text-2xl font-bold">商家登录</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">商家账号</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="account"
                  placeholder="请输入商家账号"
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
            测试账号：xiangwei / 密码：merchant123
          </p>
        </div>
      </div>
    </div>
  );
};

export default MerchantLoginPage;
