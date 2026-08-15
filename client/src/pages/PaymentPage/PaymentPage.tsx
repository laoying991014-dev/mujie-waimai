import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Loader2, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { toast } from 'sonner';
import * as orderApi from '@client/src/api/order';
import type { PaymentInfo } from '@client/src/api/order';

const formatMMK = (value: string | number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `Ks ${value}`;
  return `Ks ${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [last5, setLast5] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setInfo(await orderApi.getPaymentInfo(id)); }
    catch { toast.error('加载支付信息失败'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const copyPhone = async () => {
    if (!info?.paymentPhone) return;
    try { await navigator.clipboard.writeText(info.paymentPhone); toast.success('收款手机号已复制'); }
    catch { toast.error('复制失败'); }
  };

  const submitLast5 = async () => {
    if (!id) return;
    if (!/^\d{5}$/.test(last5)) { toast.error('请输入交易详情后5位数字'); return; }
    setSubmitting(true);
    try {
      await orderApi.submitPayment(id, last5);
      toast.success('已提交，等待商家或管理员核实');
      setShowForm(false); setLast5(''); await load();
    } catch { toast.error('提交失败，请重试'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!info) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">支付信息不存在</div>;

  const verified = ['pending_accept', 'preparing', 'delivering', 'completed'].includes(info.status);
  const review = info.status === 'payment_review';

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border/50">
        <div className="max-w-lg mx-auto h-12 px-4 flex items-center">
          <button onClick={() => navigate(`/orders/${info.orderId}`)} className="w-8 h-8 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-center font-semibold pr-8">订单支付</h1>
          <button onClick={() => load()} className="w-8 h-8 flex items-center justify-center"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <div className="text-sm text-muted-foreground">订单号</div>
          <div className="font-mono text-sm mt-1">{info.orderNo}</div>
          <div className="text-sm text-muted-foreground mt-4">需支付总金额</div>
          <div className="text-3xl font-bold text-primary font-mono mt-1">{formatMMK(info.totalAmount)}</div>
        </div>

        {verified && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" /><div className="font-semibold text-emerald-700">支付已确认到账</div><div className="text-sm text-emerald-600 mt-1">订单已进入商家/骑手处理流程</div><Button className="mt-4" onClick={() => navigate(`/orders/${info.orderId}`)}>查看订单</Button></div>}

        {!verified && !review && <>
          <div className="bg-card rounded-xl border p-5">
            <div className="text-sm text-muted-foreground mb-2">支付提示</div>
            <div className="font-semibold text-primary">请使用 KBZ Pay 进行支付</div>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <div className="font-semibold mb-3">收款人姓名</div>
            <div className="w-full rounded-lg border px-4 py-3 text-lg font-medium">收款人</div>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <div className="font-semibold mb-3">收款人手机号</div>
            <button onClick={copyPhone} className="w-full rounded-lg border px-4 py-3 flex items-center justify-between hover:bg-accent">
              <span className="font-mono text-lg">{info.paymentPhone || '暂未设置'}</span><Copy className="w-4 h-4" />
            </button>
            <div className="text-xs text-muted-foreground mt-2">点击手机号即可复制</div>
          </div>
          <Button className="w-full h-12 text-base" onClick={() => setShowForm(true)}>已支付</Button>
        </>}

        {review && <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center"><div className="text-lg font-semibold text-amber-700">等待核实付款</div><div className="text-sm text-amber-600 mt-2">您提交的交易后5位：<b>{info.paymentLast5 || '-----'}</b></div><div className="text-xs text-amber-600 mt-2">商家或管理员确认到账后，订单才会进入骑手接单大厅。</div><Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>重新提交后5位</Button></div>}

        {showForm && !verified && <div className="bg-card rounded-xl border p-5"><div className="font-semibold">请输入交易详情后5位数</div><div className="text-xs text-muted-foreground mt-1">请输入支付成功后交易详情中的最后5位数字。</div><Input className="mt-4 text-center text-xl tracking-[0.35em]" inputMode="numeric" maxLength={5} value={last5} onChange={(e) => setLast5(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="00000" /><Button className="w-full mt-4" disabled={submitting || last5.length !== 5} onClick={submitLast5}>{submitting ? '提交中...' : '确认'}</Button></div>}

        <div className="text-xs text-muted-foreground text-center pt-2"><Phone className="inline w-3 h-3 mr-1" />如支付遇到问题，请联系平台客服。</div>
      </div>
    </div>
  );
};

export default PaymentPage;
