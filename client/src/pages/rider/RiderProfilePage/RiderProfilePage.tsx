import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  Bike,
  TrendingUp,
  Star,
  Clock,
  LogOut,
  Power,
} from 'lucide-react';
import { riderApi, type RiderStats } from '../../../api/rider';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { Switch } from '@client/src/components/ui/switch';
import { useAuthStore } from '../../../store/auth';

const RiderProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState('offline');

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await riderApi.getStats();
      setStats(res);
      setOnlineStatus(res.onlineStatus);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleOnlineChange = async (checked: boolean) => {
    const newStatus = checked ? 'online' : 'offline';
    try {
      await riderApi.updateOnlineStatus(newStatus);
      setOnlineStatus(newStatus);
      toast.success(checked ? '已上线' : '已下线');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/rider/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部用户信息 */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.name || '骑手'}</h2>
              <p className="text-white/80 text-sm">{profile?.phone || ''}</p>
            </div>
            <Badge
              variant="secondary"
              className={
                onlineStatus === 'online'
                  ? 'bg-green-500 text-white'
                  : onlineStatus === 'busy'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-500 text-white'
              }
            >
              {onlineStatus === 'online' ? '在线' : onlineStatus === 'busy' ? '配送中' : '离线'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 space-y-4">
        {/* 在线状态切换 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Power className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">接单状态</p>
                <p className="text-xs text-muted-foreground">开启后可在大厅接单</p>
              </div>
            </div>
            <Switch
              checked={onlineStatus === 'online' || onlineStatus === 'busy'}
              onCheckedChange={handleOnlineChange}
              disabled={onlineStatus === 'busy'}
            />
          </div>
        </Card>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bike className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">今日完成</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">单</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-muted-foreground">累计收入</span>
            </div>
            <p className="text-2xl font-bold">¥{stats?.totalDeliveryFee || '0'}</p>
            <p className="text-xs text-muted-foreground mt-1">配送费</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">服务评分</span>
            </div>
            <p className="text-2xl font-bold">{stats?.rating || '5.0'}</p>
            <p className="text-xs text-muted-foreground mt-1">分</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">当前订单</span>
            </div>
            <p className="text-2xl font-bold">{stats?.currentOrderCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">进行中</p>
          </Card>
        </div>

        {/* 快捷入口 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">快捷操作</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/rider/hall')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3">
                <Bike className="w-5 h-5 text-primary" />
                <span>接单大厅</span>
              </span>
              <span className="text-muted-foreground">›</span>
            </button>
            <button
              onClick={() => navigate('/rider/orders')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <span>我的订单</span>
              </span>
              <span className="text-muted-foreground">›</span>
            </button>
          </div>
        </Card>

        {/* 退出登录 */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>

        <div className="text-center text-xs text-muted-foreground py-4">
          木姐外卖骑手端 v1.0
        </div>
      </div>
    </div>
  );
};

export default RiderProfilePage;
