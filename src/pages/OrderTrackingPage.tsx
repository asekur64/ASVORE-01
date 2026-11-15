import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Package, Search, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/i18n.ts';
import type { Order, OrderStatus } from '../types/index.ts';

const TRACK_STAGES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
];

export function OrderTimeline({ order }: { order: Order }) {
  const { lang } = useApp();
  const isCancelled = order.orderStatus === 'cancelled';
  const currentIdx = TRACK_STAGES.indexOf(order.orderStatus);

  return (
    <div className="space-y-6">
      {isCancelled ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-sm font-medium">
          {lang === 'bn' ? 'এই অর্ডারটি বাতিল করা হয়েছে।' : 'This order has been cancelled.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {TRACK_STAGES.map((stage, idx) => {
            const done = idx <= currentIdx;
            const label = ORDER_STATUS_LABELS[stage];
            const timelineMatch = order.timeline?.find((t) => t.status === stage);
            return (
              <div
                key={stage}
                className={`p-3 border ${
                  done ? 'border-[#111113] bg-[#FAF8F5]' : 'border-[#111113]/10 bg-white opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#B89352] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#5C5B57] shrink-0" />
                  )}
                  <span className="text-[11px] font-mono-num text-[#5C5B57]">0{idx + 1}</span>
                </div>
                <p className="text-xs font-semibold text-[#111113]">{lang === 'bn' ? label.bn : label.en}</p>
                {timelineMatch && (
                  <p className="text-[10px] text-[#5C5B57] mt-1 tabular-nums">
                    {new Date(timelineMatch.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {order.timeline && order.timeline.length > 0 && (
        <div className="border-t border-[#111113]/10 pt-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5C5B57]">
            {lang === 'bn' ? 'অবস্থান বিবরণী' : 'Status Activity Log'}
          </h4>
          <div className="space-y-2.5">
            {[...order.timeline].reverse().map((ev, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <span className="font-semibold text-[#111113]">{lang === 'bn' ? ev.titleBn : ev.titleEn}</span>
                  {(ev.noteEn || ev.noteBn) && (
                    <span className="text-[#5C5B57] ml-2">{lang === 'bn' ? ev.noteBn : ev.noteEn}</span>
                  )}
                </div>
                <span className="text-[#5C5B57] font-mono-num shrink-0">
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrderTrackingPage() {
  const { lang, apiFetch, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
        setOrder(null);
        return;
      }
      setOrder(data.order);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('order')) {
      void handleTrack();
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">
          ASVORE {lang === 'bn' ? 'রিয়েল-টাইম ট্র্যাকিং' : 'Live Dispatch Tracking'}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
          {lang === 'bn' ? 'আপনার অর্ডার ট্র্যাক করুন' : 'Track Your Order'}
        </h1>
      </div>

      <form
        onSubmit={handleTrack}
        className="bg-white border border-[#111113]/10 p-6 grid grid-cols-1 sm:grid-cols-12 gap-3"
      >
        <input
          type="text"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder={lang === 'bn' ? 'অর্ডার আইডি (যেমন ASV-2611-XXXXXX)' : 'Order ID (e.g. ASV-2611-XXXXXX)'}
          className="sm:col-span-5 px-3.5 py-2.5 text-sm border border-[#111113]/15 font-mono-num"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={lang === 'bn' ? 'মোবাইল নম্বর (017XXXXXXXX)' : 'Phone Number (017XXXXXXXX)'}
          className="sm:col-span-4 px-3.5 py-2.5 text-sm border border-[#111113]/15 tabular-nums"
        />
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-3 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? '...' : lang === 'bn' ? 'ট্র্যাক করুন' : 'Track'}</span>
        </button>
      </form>

      {order && (
        <div className="bg-white border border-[#111113]/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#111113]/10">
            <div>
              <span className="text-xs text-[#5C5B57] uppercase tracking-wider">Order ID</span>
              <h2 className="font-mono-num text-xl font-bold text-[#111113]">{order.orderNumber}</h2>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-[#5C5B57] block">{lang === 'bn' ? 'অর্ডার অবস্থা' : 'Order Status'}</span>
                <span className="font-semibold text-[#111113]">
                  {lang === 'bn'
                    ? ORDER_STATUS_LABELS[order.orderStatus]?.bn
                    : ORDER_STATUS_LABELS[order.orderStatus]?.en}
                </span>
              </div>
              <div>
                <span className="text-[#5C5B57] block">{lang === 'bn' ? 'পেমেন্ট অবস্থা' : 'Payment'}</span>
                <span className="font-semibold text-[#111113]">
                  {lang === 'bn'
                    ? PAYMENT_STATUS_LABELS[order.paymentStatus]?.bn
                    : PAYMENT_STATUS_LABELS[order.paymentStatus]?.en}
                </span>
              </div>
              <div>
                <span className="text-[#5C5B57] block">{lang === 'bn' ? 'সর্বমোট' : 'Total'}</span>
                <span className="font-semibold tabular-nums">{formatBdt(order.grandTotal, lang)}</span>
              </div>
            </div>
          </div>

          {(order.courierName || order.trackingCode) && (
            <div className="p-4 bg-[#FAF8F5] border border-[#111113]/10 flex flex-wrap items-center gap-4 text-xs">
              <Truck className="w-4 h-4 text-[#B89352]" />
              <span>
                {lang === 'bn' ? 'কুরিয়ার:' : 'Courier:'} <strong>{order.courierName || 'Partner'}</strong>
              </span>
              {order.trackingCode && (
                <span className="font-mono-num">
                  {lang === 'bn' ? 'ট্র্যাকিং:' : 'Tracking:'} <strong>{order.trackingCode}</strong>
                </span>
              )}
            </div>
          )}

          <OrderTimeline order={order} />

          <div className="border-t border-[#111113]/10 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C5B57] mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#B89352]" />
              <span>{lang === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Order Items'}</span>
            </h3>
            <div className="divide-y divide-[#111113]/8 text-sm">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between gap-4">
                  <span>
                    {lang === 'bn' ? item.nameBn : item.nameEn} × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatBdt(item.unitPrice * item.quantity, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
