import { useMemo, useState } from 'react';
import {
  Clock,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BANGLADESH_DISTRICTS } from '../../lib/bangladeshGeo.ts';
import {
  ADMIN_TEXT,
  formatBdt,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  t,
} from '../../lib/i18n.ts';
import type { Order, OrderItem, OrderStatus, PaymentMethodId, PaymentStatus } from '../../types/index.ts';
import { AdminTableSkeleton, ConfirmDialog } from './ConfirmDialog.tsx';

interface AdminOrdersViewProps {
  orders: Order[];
  loading: boolean;
  canDelete: boolean;
  onRefresh: () => Promise<void>;
}

export function AdminOrdersView({ orders, loading, canDelete, onRefresh }: AdminOrdersViewProps) {
  const { lang, products, shippingSettings, apiFetch, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [editing, setEditing] = useState<Order | null>(null);
  const [reconcileTrxId, setReconcileTrxId] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [saving, setSaving] = useState(false);

  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const couriersList = shippingSettings.couriers?.length
    ? shippingSettings.couriers
    : ['Steadfast', 'Pathao', 'RedX', 'Sundarban', 'SA Paribahan'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
      if (paymentMethodFilter !== 'all' && o.paymentMethod !== paymentMethodFilter) return false;
      if (paymentStatusFilter !== 'all' && o.paymentStatus !== paymentStatusFilter) return false;
      if (dateFrom && String(o.createdAt || '').slice(0, 10) < dateFrom) return false;
      if (dateTo && String(o.createdAt || '').slice(0, 10) > dateTo) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter, paymentMethodFilter, paymentStatusFilter, dateFrom, dateTo]);

  const openEditor = (o: Order) => {
    setEditing(JSON.parse(JSON.stringify(o)) as Order);
    setReconcileTrxId(o.transactionId || '');
    setReconcileNote('');
    setAddProductId(products[0]?.id || '');
  };

  const editedSubtotal = useMemo(() => {
    if (!editing) return 0;
    return (editing.items || []).reduce((s, it) => s + Number(it.unitPrice || 0) * Math.max(1, Number(it.quantity || 1)), 0);
  }, [editing]);

  const editedGrandTotal = useMemo(() => {
    if (!editing) return 0;
    return Math.max(
      0,
      editedSubtotal - Number(editing.discount || 0) + Number(editing.deliveryCharge || 0) + Number(editing.taxAmount || 0)
    );
  }, [editing, editedSubtotal]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/orders/${editing.id}/update`, {
        method: 'POST',
        body: JSON.stringify({
          orderStatus: editing.orderStatus,
          paymentStatus: editing.paymentStatus,
          courierName: editing.courierName || '',
          trackingCode: editing.trackingCode || '',
          internalNotes: editing.internalNotes || '',
          orderNotes: editing.orderNotes || '',
          customerName: editing.customerName,
          customerPhone: editing.customerPhone,
          customerEmail: editing.customerEmail,
          shippingAddress: editing.shippingAddress,
          items: editing.items,
          discount: Number(editing.discount || 0),
          deliveryCharge: Number(editing.deliveryCharge || 0),
          transactionId: reconcileTrxId.trim(),
          manualReconciliationNote: reconcileNote.trim(),
        }),
      });
      const d = (await res.json()) as any;
      if (!res.ok) {
        showToast(lang === 'bn' ? d.errorBn || d.error : d.error || 'Failed to update order', 'error');
        return;
      }
      showToast(lang === 'bn' ? 'অর্ডার আপডেট হয়েছে ও গ্রাহককে জানানো হয়েছে' : 'Order updated & customer notified', 'success');
      setEditing(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    const res = await apiFetch(`/api/admin/orders/export-csv?status=${encodeURIComponent(statusFilter)}`);
    if (!res.ok) {
      showToast('CSV export failed', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asvore-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(lang === 'bn' ? 'সিএসভি ডাউনলোড হয়েছে' : 'CSV exported', 'success');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await apiFetch(`/api/admin/orders/${deleteTarget.id}`, { method: 'DELETE' });
    const d = (await res.json()) as any;
    setDeleteTarget(null);
    if (!res.ok) {
      showToast(lang === 'bn' ? d.errorBn || d.error : d.error, 'error');
      return;
    }
    showToast(lang === 'bn' ? 'অর্ডার মুছে ফেলা হয়েছে' : 'Order permanently deleted', 'success');
    await onRefresh();
  };

  const addItemToOrder = () => {
    if (!editing || !addProductId) return;
    const prod = products.find((p) => p.id === addProductId);
    if (!prod) return;
    const price = prod.discountPrice && prod.discountPrice > 0 ? prod.discountPrice : prod.regularPrice;
    const nextItem: OrderItem = {
      productId: prod.id,
      slug: prod.slug,
      sku: prod.sku,
      nameEn: prod.nameEn,
      nameBn: prod.nameBn,
      image: prod.images?.[0] || '',
      unitPrice: price,
      quantity: 1,
      size: prod.sizes?.[0] || '',
      color: prod.colors?.[0]?.nameEn || '',
    };
    setEditing({ ...editing, items: [...(editing.items || []), nextItem] });
  };

  if (loading && orders.length === 0) return <AdminTableSkeleton rows={7} />;

  return (
    <div className="space-y-5">
      {/* Search & Multi-Filters Bar */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#5C5B57] absolute left-3 top-2.5" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'bn' ? 'অর্ডার আইডি, নাম বা ফোন দিয়ে খুঁজুন...' : 'Search Order ID, Name, Phone...'}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent focus:outline-none focus:border-[#B89352]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#111113]/20 dark:border-white/20 hover:border-[#B89352] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(ADMIN_TEXT.common.exportCsv, lang)}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="all">{lang === 'bn' ? 'সকল অর্ডার স্ট্যাটাস' : 'All Order Statuses'}</option>
            {Object.keys(ORDER_STATUS_LABELS).map((st) => (
              <option key={st} value={st}>
                {ORDER_STATUS_LABELS[st as OrderStatus][lang]}
              </option>
            ))}
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-2.5 py-2 border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="all">{lang === 'bn' ? 'সকল পেমেন্ট মাধ্যম' : 'All Payment Methods'}</option>
            {Object.keys(PAYMENT_METHOD_LABELS).map((pm) => (
              <option key={pm} value={pm}>
                {PAYMENT_METHOD_LABELS[pm as PaymentMethodId][lang]}
              </option>
            ))}
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-2.5 py-2 border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="all">{lang === 'bn' ? 'সকল পেমেন্ট অবস্থা' : 'All Payment Statuses'}</option>
            {Object.keys(PAYMENT_STATUS_LABELS).map((ps) => (
              <option key={ps} value={ps}>
                {PAYMENT_STATUS_LABELS[ps as PaymentStatus][lang]}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="px-2.5 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="px-2.5 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
        </div>
      </div>

      {/* Full Order Editor Modal / Panel */}
      {editing && (
        <form
          onSubmit={handleSaveOrder}
          className="bg-white dark:bg-[#17171A] border border-[#B89352]/40 p-6 space-y-6 shadow-lg"
        >
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-[#111113]/10 dark:border-white/10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#B89352] font-semibold">
                {lang === 'bn' ? 'অর্ডার ম্যানেজমেন্ট ও এডিটর' : 'Order Workbench'}
              </p>
              <h3 className="font-mono-num font-bold text-xl">
                {editing.orderNumber} · {editing.customerName}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintOrder(editing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#111113]/20 dark:border-white/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t(ADMIN_TEXT.common.print, lang)}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 text-[#5C5B57] hover:text-[#111113] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workflow & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Order Status (8 Stages)</label>
              <select
                value={editing.orderStatus}
                onChange={(e) => setEditing({ ...editing, orderStatus: e.target.value as OrderStatus })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
              >
                {Object.keys(ORDER_STATUS_LABELS).map((st) => (
                  <option key={st} value={st}>
                    {ORDER_STATUS_LABELS[st as OrderStatus][lang]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Status</label>
              <select
                value={editing.paymentStatus}
                onChange={(e) => setEditing({ ...editing, paymentStatus: e.target.value as PaymentStatus })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
              >
                {Object.keys(PAYMENT_STATUS_LABELS).map((ps) => (
                  <option key={ps} value={ps}>
                    {PAYMENT_STATUS_LABELS[ps as PaymentStatus][lang]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Courier Service</label>
              <input
                type="text"
                list="asvore-couriers"
                value={editing.courierName || ''}
                onChange={(e) => setEditing({ ...editing, courierName: e.target.value })}
                placeholder="Steadfast / Pathao / RedX"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <datalist id="asvore-couriers">
                {couriersList.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tracking Number</label>
              <input
                type="text"
                value={editing.trackingCode || ''}
                onChange={(e) => setEditing({ ...editing, trackingCode: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent font-mono-num"
              />
            </div>
          </div>

          {/* Strict Online Payment Reconciliation Guard */}
          {editing.paymentMethod !== 'cod' && (
            <div className="p-4 bg-[#FAF8F5] dark:bg-white/5 border border-[#B89352]/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Gateway Transaction ID {editing.paymentStatus === 'paid' ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={reconcileTrxId}
                  onChange={(e) => setReconcileTrxId(e.target.value)}
                  placeholder="e.g. TXN8392019"
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A] font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Manual Reconciliation Note (Required if marking online order Paid)
                </label>
                <input
                  type="text"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Verified against merchant portal settlement"
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
                />
              </div>
            </div>
          )}

          {/* Customer Info & Shipping Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Customer Name</label>
              <input
                type="text"
                value={editing.customerName}
                onChange={(e) => setEditing({ ...editing, customerName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={editing.customerPhone}
                onChange={(e) => setEditing({ ...editing, customerPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                value={editing.customerEmail || ''}
                onChange={(e) => setEditing({ ...editing, customerEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">District</label>
              <select
                value={editing.shippingAddress?.district || 'Gaibandha'}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    shippingAddress: { ...editing.shippingAddress, district: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d.nameEn} value={d.nameEn}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Upazila / Thana</label>
              <input
                type="text"
                value={editing.shippingAddress?.upazila || ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    shippingAddress: { ...editing.shippingAddress, upazila: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Street Address</label>
              <input
                type="text"
                value={editing.shippingAddress?.streetAddress || ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    shippingAddress: { ...editing.shippingAddress, streetAddress: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          </div>

          {/* Ordered Items & Pricing Editor */}
          <div className="space-y-3 border-t border-[#111113]/10 dark:border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider">Ordered Items</h4>
              <div className="flex items-center gap-2">
                <select
                  value={addProductId}
                  onChange={(e) => setAddProductId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A] max-w-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.nameEn} ({formatBdt(p.discountPrice ?? p.regularPrice, lang)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addItemToOrder}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#111113]/8 dark:divide-white/10 border border-[#111113]/10 dark:border-white/10">
              {(editing.items || []).map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{lang === 'bn' ? item.nameBn : item.nameEn}</p>
                    <p className="text-[#5C5B57] dark:text-[#FAF8F5]/60 font-mono-num">
                      {item.sku} · {formatBdt(item.unitPrice, lang)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-[#5C5B57]">Qty:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value));
                        const next = [...editing.items];
                        next[idx] = { ...next[idx], quantity: qty };
                        setEditing({ ...editing, items: next });
                      }}
                      className="w-16 px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
                    />
                    {editing.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            items: editing.items.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1 text-red-700 dark:text-red-400 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Delivery Charge (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.deliveryCharge}
                  onChange={(e) => setEditing({ ...editing, deliveryCharge: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Discount (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.discount}
                  onChange={(e) => setEditing({ ...editing, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Customer Order Notes</label>
                <input
                  type="text"
                  value={editing.orderNotes || ''}
                  onChange={(e) => setEditing({ ...editing, orderNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Internal Admin Notes</label>
                <input
                  type="text"
                  value={editing.internalNotes || ''}
                  onChange={(e) => setEditing({ ...editing, internalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-sm font-bold">
              <span>
                {lang === 'bn' ? 'হিসাবকৃত সর্বমোট:' : 'Recalculated Grand Total:'}{' '}
                <span className="text-[#B89352] tabular-nums">{formatBdt(editedGrandTotal, lang)}</span>
              </span>
              <span className="text-xs font-normal text-[#5C5B57] dark:text-[#FAF8F5]/60">
                {lang === 'bn'
                  ? 'নোট: Cancelled বা Returned করলে স্টক স্বয়ংক্রিয়ভাবে পুনরুদ্ধার হবে।'
                  : 'Note: Changing status to Cancelled or Returned automatically restores inventory stock once.'}
              </span>
            </div>
          </div>

          {/* Order Activity Timeline */}
          {Array.isArray(editing.timeline) && editing.timeline.length > 0 && (
            <div className="border-t border-[#111113]/10 dark:border-white/10 pt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B89352]" />
                <span>Order Activity Log</span>
              </h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {[...editing.timeline].reverse().map((ev, i) => (
                  <div key={i} className="flex justify-between gap-4 py-1 border-b border-[#111113]/6 dark:border-white/6">
                    <div>
                      <span className="font-semibold">{lang === 'bn' ? ev.titleBn : ev.titleEn}</span>
                      {(ev.noteEn || ev.actorEmail) && (
                        <span className="text-[#5C5B57] dark:text-[#FAF8F5]/60 ml-2">
                          {ev.noteEn} {ev.actorEmail ? `(${ev.actorEmail})` : ''}
                        </span>
                      )}
                    </div>
                    <span className="font-mono-num text-[11px] text-[#5C5B57] shrink-0">
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {saving ? '...' : lang === 'bn' ? 'অর্ডার আপডেট ও সেভ' : 'Update Order & Notify Customer'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 border border-[#111113]/20 dark:border-white/20 text-xs font-semibold uppercase cursor-pointer"
            >
              {t(ADMIN_TEXT.common.cancel, lang)}
            </button>
          </div>
        </form>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF8F5] dark:bg-white/5 border-b border-[#111113]/10 dark:border-white/10 text-xs uppercase text-[#5C5B57] dark:text-[#FAF8F5]/65">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4">Order Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111113]/8 dark:divide-white/8">
            {filtered.map((o) => {
              const deletable = canDelete && (o.orderStatus === 'cancelled' || o.paymentStatus === 'failed');
              return (
                <tr key={o.id} className="hover:bg-[#FAF8F5]/60 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-mono-num text-xs font-bold whitespace-nowrap">{o.orderNumber}</td>
                  <td className="py-3 px-4 font-mono-num text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60 whitespace-nowrap">
                    {String(o.createdAt || '').slice(0, 10)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60 tabular-nums">{o.customerPhone}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums font-semibold whitespace-nowrap">
                    {formatBdt(o.grandTotal, lang)}
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <span className="font-semibold">{o.paymentMethod.toUpperCase()}</span> ·{' '}
                    <span className={o.paymentStatus === 'paid' ? 'text-emerald-700 dark:text-emerald-400' : ''}>
                      {PAYMENT_STATUS_LABELS[o.paymentStatus]?.[lang] || o.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                    {ORDER_STATUS_LABELS[o.orderStatus]?.[lang] || o.orderStatus}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-3">
                    <button
                      type="button"
                      onClick={() => openEditor(o)}
                      className="text-xs font-semibold text-[#B89352] hover:underline cursor-pointer"
                    >
                      {t(ADMIN_TEXT.common.edit, lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintOrder(o)}
                      title="Print / Download Invoice"
                      className="inline-flex items-center text-xs hover:text-[#B89352] cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {deletable && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(o)}
                        title="Delete Cancelled/Failed Order"
                        className="inline-flex items-center text-xs text-red-700 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60">
                  {t(ADMIN_TEXT.common.noData, lang)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Invoice Modal */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-[#111113]/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-[#111113] max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-start border-b border-[#111113]/15 pb-4">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-[0.16em]">ASVORE</h2>
                <p className="text-xs text-[#5C5B57]">Shaplamill, Gaibandha Sadar · 01719478830</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono-num font-bold text-base">{printOrder.orderNumber}</p>
                <p className="text-[#5C5B57]">{new Date(printOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="uppercase font-semibold text-[#5C5B57] mb-1">Bill / Ship To</p>
                <p className="font-bold text-sm">{printOrder.customerName}</p>
                <p className="tabular-nums">{printOrder.customerPhone}</p>
                <p>
                  {printOrder.shippingAddress?.streetAddress}, {printOrder.shippingAddress?.upazila},{' '}
                  {printOrder.shippingAddress?.district}
                </p>
              </div>
              <div className="text-right">
                <p className="uppercase font-semibold text-[#5C5B57] mb-1">Payment & Courier</p>
                <p>Method: {printOrder.paymentMethod.toUpperCase()}</p>
                <p>Status: {printOrder.paymentStatus}</p>
                {printOrder.courierName && <p>Courier: {printOrder.courierName}</p>}
                {printOrder.trackingCode && <p className="font-mono-num">Tracking: {printOrder.trackingCode}</p>}
              </div>
            </div>

            <table className="w-full text-xs border-y border-[#111113]/15">
              <thead>
                <tr className="border-b border-[#111113]/10 text-left uppercase text-[#5C5B57]">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111113]/8">
                {(printOrder.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      {it.nameEn} {[it.size, it.color].filter(Boolean).join(' · ')}
                    </td>
                    <td className="py-2 text-center tabular-nums">{it.quantity}</td>
                    <td className="py-2 text-right tabular-nums">৳{it.unitPrice}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">৳{it.unitPrice * it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end text-xs">
              <div className="w-56 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">৳{printOrder.subtotal}</span>
                </div>
                {printOrder.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="tabular-nums">-৳{printOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="tabular-nums">৳{printOrder.deliveryCharge}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#111113]/15">
                  <span>Grand Total</span>
                  <span className="tabular-nums">৳{printOrder.grandTotal}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111113] text-white text-xs font-semibold uppercase cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2 border border-[#111113]/20 text-xs font-semibold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        lang={lang}
        destructive
        title={lang === 'bn' ? 'অর্ডার স্থায়ীভাবে মুছবেন?' : 'Permanently Delete Order?'}
        message={
          lang === 'bn'
            ? `অর্ডার ${deleteTarget?.orderNumber || ''} ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলা হবে।`
            : `Order ${deleteTarget?.orderNumber || ''} will be permanently removed from Firestore.`
        }
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
