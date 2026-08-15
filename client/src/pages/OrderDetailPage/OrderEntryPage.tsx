import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import * as orderApi from '@client/src/api/order';
import OrderDetailPage from './OrderDetailPage';

const OrderEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!id) { setReady(true); return; }
      try {
        const order = await orderApi.getOrderDetail(id);
        if (!cancelled && (order.status === 'pending_payment' || order.status === 'payment_review')) {
          navigate(`/payment/${id}`, { replace: true });
          return;
        }
      } catch { /* detail page will handle the error */ }
      if (!cancelled) setReady(true);
    };
    void check();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return <OrderDetailPage />;
};

export default OrderEntryPage;
