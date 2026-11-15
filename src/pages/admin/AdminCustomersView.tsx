import { useMemo, useState } from 'react';
import { MapPin, Plus, Search, ShieldCheck, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BANGLADESH_DISTRICTS } from '../../lib/bangladeshGeo.ts';
import { ADMIN_TEXT, formatBdt, ORDER_STATUS_LABELS, t } from '../../lib/i18n.ts';
import type { Address, Order, OrderStatus } from '../../types/index.ts';
import { AdminTableSkeleton, ConfirmDialog } from './ConfirmDialog.tsx';

interface AdminCustomersViewProps {
  customers: any[];
  loading: boolean;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}

export function AdminCustomersView({ customers, loading, canEdit, onRefresh }: AdminCustomersViewProps) {
  const { lang, apiFetch, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<{
    customer: any;
    addresses: Address[];
    orders: Order[];
    totalSpent: number;
  } | null>(null);

  const [editForm, setEditForm] = useState({ fullName: '', phone: '', email: '' });
  const [newAddress, setNewAddress] = useState<Partial<Address> | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const active = c.isActive !== false;
      if (statusFilter === 'active' && !active) return false;
      if (statusFilter === 'suspended' && active) return false;
      if (!q) return true;
      return (
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.uid || '').toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  const openDetails = async (uid: string) => {
    setSelectedUid(uid);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/admin/customers/${uid}/details`);
      if (res.ok) {
        const d = (await res.json()) as any;
        setDetail(d);
        setEditForm({
          fullName: d.customer?.fullName || '',
          phone: d.customer?.phone || '',
          email: d.customer?.email || '',
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUid) return;
    const res = await apiFetch(`/api/admin/customers/${selectedUid}/update`, {
      method: 'POST',
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      showToast(lang === 'bn' ? 'গ্রাহকের তথ্য আপডেট হয়েছে' : 'Customer profile updated', 'success');
      await openDetails(selectedUid);
      await onRefresh();
    } else {
      showToast('Failed to update customer', 'error');
    }
  };

  const handleToggleSuspend = async () => {
    if (!suspendTarget) return;
    const nextActive = suspendTarget.isActive === false;
    const res = await apiFetch(`/api/admin/customers/${suspendTarget.uid}/update`, {
      method: 'POST',
      body: JSON.stringify({ isActive: nextActive }),
    });
    const uid = suspendTarget.uid;
    setSuspendTarget(null);
    if (res.ok) {
      showToast(
        nextActive
          ? lang === 'bn'
            ? 'গ্রাহক অ্যাকাউন্ট সক্রিয় করা হয়েছে'
            : 'Customer account restored'
          : lang === 'bn'
            ? 'গ্রাহক অ্যাকাউন্ট স্থগিত করা হয়েছে'
            : 'Customer account suspended',
        'success'
      );
      await onRefresh();
      if (selectedUid === uid) await openDetails(uid);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUid || !newAddress) return;
    const res = await apiFetch(`/api/admin/customers/${selectedUid}/update`, {
      method: 'POST',
      body: JSON.stringify({ addressAction: 'upsert', address: newAddress }),
    });
    if (res.ok) {
      setNewAddress(null);
      showToast(lang === 'bn' ? 'ঠিকানা সংরক্ষিত হয়েছে' : 'Address saved', 'success');
      await openDetails(selectedUid);
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!selectedUid) return;
    const res = await apiFetch(`/api/admin/customers/${selectedUid}/update`, {
      method: 'POST',
      body: JSON.stringify({ addressAction: 'delete', addressId: addrId }),
    });
    if (res.ok) {
      showToast('Address removed', 'success');
      await openDetails(selectedUid);
    }
  };

  if (loading && customers.length === 0) return <AdminTableSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-[#5C5B57] absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'bn' ? 'নাম, ইমেইল, ফোন বা আইডি দিয়ে খুঁজুন...' : 'Search by name, email, phone or ID...'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent focus:outline-none focus:border-[#B89352]"
          />
        </div>
        <div className="flex gap-1.5 text-xs">
          {(
            [
              ['all', lang === 'bn' ? 'সকল' : 'All'],
              ['active', lang === 'bn' ? 'সক্রিয়' : 'Active'],
              ['suspended', lang === 'bn' ? 'স্থগিত' : 'Suspended'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`px-3 py-1.5 font-semibold border cursor-pointer ${
                statusFilter === id
                  ? 'bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] border-transparent'
                  : 'border-[#111113]/15 dark:border-white/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Detail & Edit Panel */}
      {selectedUid && (
        <div className="bg-white dark:bg-[#17171A] border border-[#B89352]/40 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#111113]/10 dark:border-white/10">
            <div className="flex items-center gap-4">
              {detail?.customer?.photoUrl ? (
                <img
                  src={detail.customer.photoUrl}
                  alt={detail.customer.fullName}
                  className="w-12 h-12 object-cover border border-[#111113]/15"
                />
              ) : (
                <div className="w-12 h-12 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] flex items-center justify-center font-display text-xl font-bold">
                  {(detail?.customer?.fullName || 'A').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-display text-xl font-semibold">{detail?.customer?.fullName || '...'}</h3>
                <p className="font-mono-num text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/60">
                  ID: {selectedUid} · Joined {detail?.customer?.createdAt ? String(detail.customer.createdAt).slice(0, 10) : '—'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedUid(null);
                setDetail(null);
              }}
              className="p-1.5 text-[#5C5B57] hover:text-[#111113] dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {detailLoading ? (
            <AdminTableSkeleton rows={3} />
          ) : detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Profile Editor */}
              <form onSubmit={handleSaveProfile} className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider">Customer Profile</h4>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="email"
                  disabled={!canEdit}
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="tel"
                  disabled={!canEdit}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Phone"
                  className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
                />

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span>
                    Total Spending: <strong className="tabular-nums text-[#B89352]">{formatBdt(detail.totalSpent, lang)}</strong>
                  </span>
                  <span>
                    Orders: <strong className="tabular-nums">{detail.orders.length}</strong>
                  </span>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-semibold uppercase cursor-pointer"
                    >
                      {t(ADMIN_TEXT.common.save, lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspendTarget(detail.customer)}
                      className={`px-4 py-2 text-xs font-semibold uppercase border cursor-pointer ${
                        detail.customer.isActive !== false
                          ? 'border-red-700/40 text-red-700 dark:text-red-400'
                          : 'border-emerald-700/40 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {detail.customer.isActive !== false
                        ? lang === 'bn'
                          ? 'অ্যাকাউন্ট স্থগিত'
                          : 'Suspend Account'
                        : lang === 'bn'
                          ? 'অ্যাকাউন্ট সক্রিয় করুন'
                          : 'Restore Account'}
                    </button>
                  </div>
                )}
              </form>

              {/* Saved Addresses & Order History */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B89352]" />
                      <span>Addresses ({detail.addresses.length})</span>
                    </h4>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewAddress({
                            label: 'Home',
                            fullName: detail.customer.fullName || '',
                            phone: detail.customer.phone || '',
                            district: 'Gaibandha',
                            upazila: 'Gaibandha Sadar',
                            streetAddress: '',
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#B89352] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Address</span>
                      </button>
                    )}
                  </div>

                  {newAddress && (
                    <form onSubmit={handleSaveAddress} className="p-3 bg-[#FAF8F5] dark:bg-white/5 border border-[#111113]/15 dark:border-white/15 grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Label (Home/Office)"
                        value={newAddress.label || ''}
                        onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                        className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Phone"
                        value={newAddress.phone || ''}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                      />
                      <select
                        value={newAddress.district || 'Gaibandha'}
                        onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                        className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
                      >
                        {BANGLADESH_DISTRICTS.map((d) => (
                          <option key={d.nameEn} value={d.nameEn}>
                            {d.nameEn}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Upazila"
                        value={newAddress.upazila || ''}
                        onChange={(e) => setNewAddress({ ...newAddress, upazila: e.target.value })}
                        className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Street Address"
                        value={newAddress.streetAddress || ''}
                        onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                        className="col-span-2 px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                      />
                      <div className="col-span-2 flex gap-2">
                        <button type="submit" className="px-3 py-1.5 bg-[#111113] text-white font-semibold cursor-pointer">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAddress(null)}
                          className="px-3 py-1.5 border border-[#111113]/20 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {detail.addresses.map((a) => (
                      <div key={a.id} className="p-3 border border-[#111113]/10 dark:border-white/10 flex justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {a.label || a.district} · {a.fullName}
                          </p>
                          <p className="text-[#5C5B57] dark:text-[#FAF8F5]/65">
                            {a.streetAddress}, {a.upazila}, {a.district}
                          </p>
                          <p className="tabular-nums text-[#5C5B57] dark:text-[#FAF8F5]/65">{a.phone}</p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteAddress(a.id)}
                            className="text-red-700 dark:text-red-400 self-start cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Order History</h4>
                  <div className="divide-y divide-[#111113]/8 dark:divide-white/8 max-h-48 overflow-y-auto text-xs border border-[#111113]/10 dark:border-white/10">
                    {detail.orders.map((o) => (
                      <div key={o.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-mono-num font-bold mr-2">{o.orderNumber}</span>
                          <span className="text-[#5C5B57] dark:text-[#FAF8F5]/60">{String(o.createdAt).slice(0, 10)}</span>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatBdt(o.grandTotal, lang)} · {ORDER_STATUS_LABELS[o.orderStatus as OrderStatus]?.[lang] || o.orderStatus}
                        </span>
                      </div>
                    ))}
                    {detail.orders.length === 0 && (
                      <p className="p-3 text-[#5C5B57] dark:text-[#FAF8F5]/60">No orders placed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF8F5] dark:bg-white/5 border-b border-[#111113]/10 dark:border-white/10 text-xs uppercase text-[#5C5B57] dark:text-[#FAF8F5]/65">
            <tr>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Email & Phone</th>
              <th className="py-3 px-4">Orders</th>
              <th className="py-3 px-4">Total Spent</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111113]/8 dark:divide-white/8">
            {filtered.map((c) => {
              const active = c.isActive !== false;
              return (
                <tr key={c.uid} className="hover:bg-[#FAF8F5]/60 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <p className="font-medium">{c.fullName || 'ASVORE Member'}</p>
                    <p className="font-mono-num text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/55 truncate max-w-[140px]">
                      {c.uid}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <p>{c.email}</p>
                    <p className="text-[#5C5B57] dark:text-[#FAF8F5]/60 tabular-nums">{c.phone || '—'}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums">{c.orderCount || 0}</td>
                  <td className="py-3 px-4 tabular-nums font-semibold">{formatBdt(c.totalSpent || 0, lang)}</td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        active ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {active ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{active ? 'Active' : 'Suspended'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-3">
                    <button
                      type="button"
                      onClick={() => void openDetails(c.uid)}
                      className="text-xs font-semibold text-[#B89352] hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'বিস্তারিত' : 'Inspect'}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setSuspendTarget(c)}
                        className="text-xs underline cursor-pointer text-[#5C5B57] dark:text-[#FAF8F5]/75"
                      >
                        {active ? (
                          <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                            <UserX className="w-3 h-3" /> Suspend
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <UserCheck className="w-3 h-3" /> Restore
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60">
                  {t(ADMIN_TEXT.common.noData, lang)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        lang={lang}
        destructive={suspendTarget?.isActive !== false}
        title={
          suspendTarget?.isActive !== false
            ? lang === 'bn'
              ? 'গ্রাহক অ্যাকাউন্ট স্থগিত করবেন?'
              : 'Suspend Customer Account?'
            : lang === 'bn'
              ? 'গ্রাহক অ্যাকাউন্ট পুনরুদ্ধার করবেন?'
              : 'Restore Customer Account?'
        }
        message={`${suspendTarget?.fullName || ''} (${suspendTarget?.email || ''})`}
        onConfirm={() => void handleToggleSuspend()}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
}
