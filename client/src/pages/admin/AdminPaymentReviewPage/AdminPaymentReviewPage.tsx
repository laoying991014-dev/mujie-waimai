import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@client/src/components/ui/table';
import { listOrders, verifyPayment } from '@client/src/api/admin-order';
import type { AdminOrder } from '@shared/api.interface';

const AdminPaymentReviewPage: React.FC = () => {
  const [items, setItems] = useState<AdminOrder[]>([]); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const r = await listOrders({ page: 1, pageSize: 50, status: 'payment_review' }); setItems(r.items); } catch { toast.error('加载待核实付款失败'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const verify = async (id: string, received: boolean) => { setBusy(id); try { await verifyPayment(id, received); toast.success(received ? '已确认到账，订单已进入待接单' : '已标记未到账，客户可重新提交'); await load(); } catch { toast.error('操作失败，请重试'); } finally { setBusy(null); } };
  return <div className="p-6 space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">付款核实</h1><p className="text-sm text-muted-foreground mt-1">核对客户提交的交易详情后5位，确认到账后订单才会进入骑手接单大厅。</p></div><Button variant="outline" onClick={() => load()} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />刷新</Button></div><div className="rounded-xl border bg-card shadow-sm overflow-hidden"><Table><TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>商家</TableHead><TableHead>客户</TableHead><TableHead>应付金额</TableHead><TableHead>交易后5位</TableHead><TableHead>下单时间</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={8} className="text-center py-10">加载中...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无待核实付款</TableCell></TableRow> : items.map((o) => <TableRow key={o.id}><TableCell className="font-mono text-xs">{o.orderNo}</TableCell><TableCell>{o.merchantName}</TableCell><TableCell>{o.userName}</TableCell><TableCell className="font-mono font-semibold text-primary">¥{o.totalAmount}</TableCell><TableCell className="font-mono text-lg font-bold tracking-widest">{o.paymentLast5 || '-----'}</TableCell><TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString('zh-CN')}</TableCell><TableCell><Badge variant="outline">待核实</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => verify(o.id, true)} disabled={busy === o.id}><CheckCircle2 className="w-4 h-4" />确认到账</Button><Button size="sm" variant="destructive" onClick={() => verify(o.id, false)} disabled={busy === o.id}><XCircle className="w-4 h-4" />未到账</Button></div></TableCell></TableRow>)}</TableBody></Table></div></div>;
};
export default AdminPaymentReviewPage;
