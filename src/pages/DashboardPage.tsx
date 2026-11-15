import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  updatePassword,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  Check,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Printer,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BANGLADESH_DISTRICTS, isValidBdPhone } from '../lib/bangladeshGeo.ts';
import { auth, db } from '../lib/firebase.ts';
import { formatBdt, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/i18n.ts';
import type { Address, Order } from '../types/index.ts';
import { OrderTimeline } from './OrderTrackingPage.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

export function DashboardPage() {
  const {
    lang,
    user,
    profile,
    authReady,
    products,
    wishlistIds,
    notifications,
    unreadNotificationsCount,
    logout,
    apiFetch,
    showToast,
  } = useApp();

  const [tab, setTab] = useState<'profile' | 'orders' | 'tracking' | 'notifications' | 'wishlist' | 'security'>(
    'orders'
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpPreview, setOtpPreview] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // New Address Form
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrDistrict, setAddrDistrict] = useState('Gaibandha');
  const [addrUpazila, setAddrUpazila] = useState('Gaibandha Sadar');
  const [addrArea, setAddrArea] = useState('');
  const [addrStreet, setAddrStreet] = useState('');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setPhotoUrl(profile.photoUrl || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        setOrders(list);
        if (list.length > 0 && !selectedOrder) setSelectedOrder(list[0]);
      },
      () => {}
    );

    const unsubAddr = onSnapshot(
      collection(db, 'users', user.uid, 'addresses'),
      (snap) => {
        setAddresses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, 'id'>) })));
      },
      () => {}
    );

    return () => {
      unsubOrders();
      unsubAddr();
    };
  }, [user]);

  if (!authReady) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const filteredOrders =
    orderFilter === 'all' ? orders : orders.filter((o) => o.orderStatus === orderFilter);

  const wishedProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          fullName: fullName.trim(),
          email: profile?.email || user.email || '',
          phone: phone.trim(),
          photoUrl: photoUrl.trim(),
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated', 'success');
    } catch {
      showToast(lang === 'bn' ? 'প্রোফাইল আপডেট ব্যর্থ হয়েছে' : 'Update failed', 'error');
    }
  };

  const handleRequestPhoneOtp = async () => {
    if (!isValidBdPhone(phone)) {
      showToast(lang === 'bn' ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter a valid BD mobile number', 'error');
      return;
    }
    const res = await apiFetch('/api/auth/phone-otp-request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) {
      showToast(data.error || 'OTP failed', 'error');
      return;
    }
    setOtpRequested(true);
    if (data.verificationCodePreview) setOtpPreview(data.verificationCodePreview);
    showToast(lang === 'bn' ? 'ভেরিফিকেশন কোড পাঠানো হয়েছে' : 'Verification code sent', 'success');
  };

  const handleVerifyPhoneOtp = async () => {
    const res = await apiFetch('/api/auth/phone-otp-verify', {
      method: 'POST',
      body: JSON.stringify({ code: otpInput.trim() }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) {
      showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
      return;
    }
    setOtpRequested(false);
    setOtpInput('');
    showToast(lang === 'bn' ? 'মোবাইল নম্বর ভেরিফাই হয়েছে!' : 'Phone number verified!', 'success');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'addresses'), {
      label: addrLabel.trim() || 'Home',
      fullName: fullName || user.displayName || 'Customer',
      phone: phone || '01700000000',
      district: addrDistrict,
      upazila: addrUpazila,
      deliveryArea: addrArea.trim(),
      streetAddress: addrStreet.trim(),
      isDefault: addresses.length === 0,
      createdAt: new Date().toISOString(),
    });
    setAddrArea('');
    setAddrStreet('');
    showToast(lang === 'bn' ? 'নতুন ঠিকানা যোগ হয়েছে' : 'Address saved', 'success');
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    const batch = writeBatch(db);
    addresses.forEach((a) => {
      batch.update(doc(db, 'users', user.uid, 'addresses', a.id), { isDefault: a.id === addrId });
    });
    await batch.commit();
  };

  const handleCancelOrder = async (orderId: string) => {
    const res = await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    const data = (await res.json()) as any;
    if (!res.ok) {
      showToast(data.error || 'Could not cancel order', 'error');
      return;
    }
    showToast(lang === 'bn' ? 'অর্ডার বাতিল করা হয়েছে' : 'Order cancelled', 'success');
  };

  const handleMarkAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter((n) => !n.read).forEach((n) => {
      batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || newPassword !== confirmNewPassword) {
      showToast(
        lang === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের এবং মিলতে হবে' : 'Passwords must match (min 8 chars)',
        'error'
      );
      return;
    }
    try {
      if (user.email && currentPassword) {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
      }
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast(lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন হয়েছে' : 'Password updated successfully', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Password update failed. Re-sign in and try again.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#111113]/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-1">
            {lang === 'bn' ? 'ক্লায়েন্ট পোর্টাল' : 'Client Account'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
            {profile?.fullName || user.displayName || user.email}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-[#111113]/20 hover:bg-[#111113] hover:text-[#FAF8F5] transition-colors cursor-pointer self-start"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Tabs */}
        <aside className="lg:col-span-3 bg-white border border-[#111113]/10 divide-y divide-[#111113]/8">
          {(
            [
              { id: 'orders', icon: Package, en: 'Order History', bn: 'অর্ডার ইতিহাস' },
              { id: 'tracking', icon: MapPin, en: 'Order Tracking', bn: 'অর্ডার ট্র্যাকিং' },
              {
                id: 'notifications',
                icon: Bell,
                en: `Notifications (${unreadNotificationsCount})`,
                bn: `নোটিফিকেশন (${unreadNotificationsCount})`,
              },
              { id: 'profile', icon: UserIcon, en: 'Profile & Addresses', bn: 'প্রোফাইল ও ঠিকানা' },
              { id: 'wishlist', icon: Heart, en: `Wishlist (${wishedProducts.length})`, bn: `উইশলিস্ট (${wishedProducts.length})` },
              { id: 'security', icon: KeyRound, en: 'Password & Security', bn: 'পাসওয়ার্ড ও নিরাপত্তা' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left transition-colors cursor-pointer ${
                tab === item.id ? 'bg-[#111113] text-[#FAF8F5]' : 'text-[#111113] hover:bg-[#FAF8F5]'
              }`}
            >
              <item.icon className={`w-4 h-4 ${tab === item.id ? 'text-[#C9A461]' : 'text-[#5C5B57]'}`} />
              <span>{lang === 'bn' ? item.bn : item.en}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {tab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderFilter(st)}
                      className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer ${
                        orderFilter === st
                          ? 'bg-[#111113] text-[#FAF8F5] border-[#111113]'
                          : 'bg-white border-[#111113]/15 text-[#5C5B57]'
                      }`}
                    >
                      {st === 'all'
                        ? lang === 'bn'
                          ? 'সকল অর্ডার'
                          : 'All'
                        : lang === 'bn'
                          ? ORDER_STATUS_LABELS[st].bn
                          : ORDER_STATUS_LABELS[st].en}
                    </button>
                  )
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-white border border-[#111113]/10 p-10 text-center space-y-3">
                  <p className="text-sm text-[#5C5B57]">
                    {lang === 'bn' ? 'এই ক্যাটাগরিতে কোনো অর্ডার নেই।' : 'No orders found in this view.'}
                  </p>
                  <Link
                    to="/shop"
                    className="inline-block px-5 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider"
                  >
                    {lang === 'bn' ? 'শপিং করুন' : 'Explore Shop'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((o) => (
                    <div key={o.id} className="bg-white border border-[#111113]/10 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#111113]/8">
                        <div>
                          <span className="font-mono-num text-base font-bold text-[#111113]">{o.orderNumber}</span>
                          <p className="text-xs text-[#5C5B57] mt-0.5 tabular-nums">
                            {new Date(o.createdAt).toLocaleString()} · {o.paymentMethod.toUpperCase()} ·{' '}
                            {lang === 'bn'
                              ? PAYMENT_STATUS_LABELS[o.paymentStatus]?.bn
                              : PAYMENT_STATUS_LABELS[o.paymentStatus]?.en}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold px-2.5 py-1 bg-[#FAF8F5] border border-[#111113]/15">
                            {lang === 'bn'
                              ? ORDER_STATUS_LABELS[o.orderStatus]?.bn
                              : ORDER_STATUS_LABELS[o.orderStatus]?.en}
                          </span>
                          <span className="font-semibold text-sm tabular-nums">{formatBdt(o.grandTotal, lang)}</span>
                        </div>
                      </div>

                      <div className="divide-y divide-[#111113]/6 text-sm">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="py-2 flex justify-between">
                            <span>
                              {lang === 'bn' ? item.nameBn : item.nameEn} × {item.quantity}
                            </span>
                            <span className="tabular-nums">{formatBdt(item.unitPrice * item.quantity, lang)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(o);
                            setTab('tracking');
                          }}
                          className="px-4 py-2 text-xs font-semibold bg-[#111113] text-[#FAF8F5] cursor-pointer"
                        >
                          {lang === 'bn' ? 'ট্র্যাকিং দেখুন' : 'Track Status'}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#111113]/15 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'ইনভয়েস' : 'Invoice'}</span>
                        </button>
                        {['pending', 'confirmed'].includes(o.orderStatus) && (
                          <button
                            type="button"
                            onClick={() => void handleCancelOrder(o.id)}
                            className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 cursor-pointer"
                          >
                            {lang === 'bn' ? 'অর্ডার বাতিল করুন' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tracking' && (
            <div className="bg-white border border-[#111113]/10 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold">
                  {lang === 'bn' ? 'লাইভ অর্ডার ট্র্যাকিং' : 'Live Order Tracking'}
                </h2>
                {orders.length > 0 && (
                  <select
                    value={selectedOrder?.id || ''}
                    onChange={(e) => setSelectedOrder(orders.find((o) => o.id === e.target.value) || null)}
                    className="px-3 py-2 text-xs font-mono-num border border-[#111113]/15 bg-white"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} ({formatBdt(o.grandTotal, lang)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedOrder ? (
                <OrderTimeline order={selectedOrder} />
              ) : (
                <p className="text-sm text-[#5C5B57]">
                  {lang === 'bn' ? 'ট্র্যাক করার মতো কোনো অর্ডার নেই।' : 'Place an order to track delivery progress.'}
                </p>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-white border border-[#111113]/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">
                  {lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
                </h2>
                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B89352] hover:underline cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'সবগুলো পঠিত চিহ্নিত করুন' : 'Mark All as Read'}</span>
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-sm text-[#5C5B57] py-8 text-center">
                  {lang === 'bn' ? 'কোনো নতুন নোটিফিকেশন নেই।' : 'You are all caught up.'}
                </p>
              ) : (
                <div className="divide-y divide-[#111113]/8">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.read) void updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
                      }}
                      className={`py-4 px-3 flex items-start justify-between gap-4 cursor-pointer ${
                        n.read ? 'opacity-70' : 'bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#111113]">
                          {lang === 'bn' ? n.titleBn : n.titleEn}
                        </p>
                        <p className="text-xs text-[#5C5B57]">{lang === 'bn' ? n.bodyBn : n.bodyEn}</p>
                        <p className="text-[11px] font-mono-num text-[#5C5B57]">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteDoc(doc(db, 'users', user.uid, 'notifications', n.id));
                        }}
                        aria-label="Delete notification"
                        className="text-[#5C5B57] hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="bg-white border border-[#111113]/10 p-6 space-y-4">
                <h2 className="font-display text-2xl font-semibold">
                  {lang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                      {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                      {lang === 'bn' ? 'ইমেইল' : 'Email'}{' '}
                      <span className="text-[11px] text-[#B89352]">
                        ({user.emailVerified ? 'Verified' : 'Unverified'})
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        disabled
                        value={user.email || ''}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 bg-[#FAF8F5]"
                      />
                      {!user.emailVerified && (
                        <button
                          type="button"
                          onClick={() => void sendEmailVerification(user).then(() => showToast('Verification email sent', 'success'))}
                          className="px-3 text-xs font-semibold bg-[#111113] text-[#FAF8F5] whitespace-nowrap cursor-pointer"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                      {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone'}{' '}
                      {profile?.phoneVerified && <span className="text-emerald-700 text-[11px]">(Verified)</span>}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                      />
                      {!profile?.phoneVerified && (
                        <button
                          type="button"
                          onClick={() => void handleRequestPhoneOtp()}
                          className="px-3 text-xs font-semibold border border-[#111113]/20 whitespace-nowrap cursor-pointer"
                        >
                          {lang === 'bn' ? 'ভেরিফাই' : 'Verify OTP'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                      {lang === 'bn' ? 'প্রোফাইল ছবির লিংক' : 'Profile Picture URL'}
                    </label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                    />
                  </div>
                </div>

                {otpRequested && (
                  <div className="p-4 bg-[#FAF8F5] border border-[#111113]/10 space-y-2">
                    <p className="text-xs text-[#5C5B57]">
                      {lang === 'bn' ? '৬ সংখ্যার OTP কোড লিখুন:' : 'Enter 6-digit OTP code:'}{' '}
                      {otpPreview && <strong className="font-mono-num text-[#111113]">({otpPreview})</strong>}
                    </p>
                    <div className="flex gap-2 max-w-xs">
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-[#111113]/15 font-mono-num"
                      />
                      <button
                        type="button"
                        onClick={() => void handleVerifyPhoneOtp()}
                        className="px-4 py-2 bg-[#111113] text-[#FAF8F5] text-xs font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Profile'}
                </button>
              </form>

              {/* Saved Delivery Addresses */}
              <div className="bg-white border border-[#111113]/10 p-6 space-y-5">
                <h2 className="font-display text-2xl font-semibold">
                  {lang === 'bn' ? 'ডেলিভারি ঠিকানা সমূহ' : 'Saved Delivery Addresses'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-4 border border-[#111113]/15 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-[#111113]">{addr.label || 'Address'}</span>
                        {addr.isDefault && (
                          <span className="text-[#B89352] font-semibold">
                            {lang === 'bn' ? 'ডিফল্ট' : 'Default'}
                          </span>
                        )}
                      </div>
                      <p className="text-[#5C5B57]">{addr.streetAddress}</p>
                      <p className="text-[#5C5B57]">
                        {addr.upazila}, {addr.district}
                      </p>
                      <div className="flex gap-3 pt-2">
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => void handleSetDefaultAddress(addr.id)}
                            className="underline font-semibold cursor-pointer"
                          >
                            {lang === 'bn' ? 'ডিফল্ট করুন' : 'Set Default'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteDoc(doc(db, 'users', user.uid, 'addresses', addr.id))}
                          className="text-red-700 underline cursor-pointer"
                        >
                          {lang === 'bn' ? 'মুছুন' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddAddress} className="pt-4 border-t border-[#111113]/10 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider">
                    {lang === 'bn' ? 'নতুন ঠিকানা যোগ করুন' : 'Add New Address'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      placeholder="Label (Home / Office)"
                      className="px-3 py-2 text-sm border border-[#111113]/15"
                    />
                    <select
                      value={addrDistrict}
                      onChange={(e) => {
                        setAddrDistrict(e.target.value);
                        const d = BANGLADESH_DISTRICTS.find((x) => x.nameEn === e.target.value);
                        if (d?.upazilas[0]) setAddrUpazila(d.upazilas[0]);
                      }}
                      className="px-3 py-2 text-sm border border-[#111113]/15 bg-white"
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d.nameEn} value={d.nameEn}>
                          {lang === 'bn' ? d.nameBn : d.nameEn}
                        </option>
                      ))}
                    </select>
                    <select
                      value={addrUpazila}
                      onChange={(e) => setAddrUpazila(e.target.value)}
                      className="px-3 py-2 text-sm border border-[#111113]/15 bg-white"
                    >
                      {(BANGLADESH_DISTRICTS.find((d) => d.nameEn === addrDistrict)?.upazilas || []).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={addrArea}
                      onChange={(e) => setAddrArea(e.target.value)}
                      placeholder={lang === 'bn' ? 'এলাকা' : 'Delivery Area'}
                      className="px-3 py-2 text-sm border border-[#111113]/15"
                    />
                    <input
                      type="text"
                      required
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      placeholder={lang === 'bn' ? 'সম্পূর্ণ ঠিকানা' : 'Complete Street Address'}
                      className="px-3 py-2 text-sm border border-[#111113]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    {lang === 'bn' ? 'ঠিকানা সংরক্ষণ করুন' : 'Add Address'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishedProducts.length === 0 ? (
                <p className="col-span-full bg-white border border-[#111113]/10 p-10 text-center text-sm text-[#5C5B57]">
                  {lang === 'bn' ? 'আপনার উইশলিস্ট খালি।' : 'Your wishlist is empty.'}
                </p>
              ) : (
                wishedProducts.map((p) => <ProductCard key={p.id} product={p} />)
              )}
            </div>
          )}

          {tab === 'security' && (
            <form onSubmit={handleChangePassword} className="bg-white border border-[#111113]/10 p-6 space-y-4 max-w-lg">
              <h2 className="font-display text-2xl font-semibold">
                {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
              </h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                {lang === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
