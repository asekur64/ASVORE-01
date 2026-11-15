import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BANGLADESH_DISTRICTS, isValidBdPhone } from '../lib/bangladeshGeo.ts';
import { db } from '../lib/firebase.ts';
import { formatBdt, PAYMENT_METHOD_LABELS, t, UI_TEXT } from '../lib/i18n.ts';
import type { Address, PaymentMethodId } from '../types/index.ts';

export function CheckoutPage() {
  const {
    lang,
    user,
    profile,
    cart,
    cartSubtotal,
    clearCart,
    shippingSettings,
    gatewayFlags,
    siteSettings,
    apiFetch,
    showToast,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as { couponCode?: string; couponDiscount?: number };

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [fullName, setFullName] = useState(profile?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [district, setDistrict] = useState('Gaibandha');
  const [upazila, setUpazila] = useState('Gaibandha Sadar');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [couponInput, setCouponInput] = useState(navState.couponCode || '');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    navState.couponCode ? { code: navState.couponCode, discount: navState.couponDiscount || 0 } : null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(gatewayFlags.defaultMethod || 'cod');
  const [submitting, setSubmitting] = useState(false);
  const [gatewayNotice, setGatewayNotice] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (!fullName) setFullName(profile.fullName || '');
      if (!phone && profile.phone) setPhone(profile.phone);
      if (!email && profile.email) setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'addresses'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, 'id'>) }));
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def && !streetAddress) {
          setFullName(def.fullName);
          setPhone(def.phone);
          setDistrict(def.district);
          setUpazila(def.upazila);
          setDeliveryArea(def.deliveryArea || '');
          setStreetAddress(def.streetAddress);
        }
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  const activeDistrictObj = useMemo(
    () => BANGLADESH_DISTRICTS.find((d) => d.nameEn === district) || BANGLADESH_DISTRICTS[0],
    [district]
  );

  const isInsideGaibandha = district.toLowerCase() === 'gaibandha';

  const deliveryCharge = useMemo(() => {
    const net = cartSubtotal - (appliedCoupon?.discount || 0);
    if (shippingSettings.freeShippingThreshold > 0 && net >= shippingSettings.freeShippingThreshold) {
      return 0;
    }
    if (shippingSettings.upazilaOverrides && typeof shippingSettings.upazilaOverrides[upazila] === 'number') {
      return shippingSettings.upazilaOverrides[upazila];
    }
    if (shippingSettings.districtOverrides && typeof shippingSettings.districtOverrides[district] === 'number') {
      return shippingSettings.districtOverrides[district];
    }
    return isInsideGaibandha ? shippingSettings.insideGaibandhaCharge : shippingSettings.outsideGaibandhaCharge;
  }, [cartSubtotal, appliedCoupon, shippingSettings, district, upazila, isInsideGaibandha]);

  const taxAmount =
    siteSettings.taxRatePercent > 0
      ? Math.round(((cartSubtotal - (appliedCoupon?.discount || 0)) * siteSettings.taxRatePercent) / 100)
      : 0;
  const grandTotal = Math.max(0, cartSubtotal - (appliedCoupon?.discount || 0) + deliveryCharge + taxAmount);

  const enabledGateways = useMemo(() => {
    const list: PaymentMethodId[] = [];
    if (gatewayFlags.codEnabled) list.push('cod');
    if (gatewayFlags.bkashEnabled) list.push('bkash');
    if (gatewayFlags.nagadEnabled) list.push('nagad');
    if (gatewayFlags.rocketEnabled) list.push('rocket');
    if (gatewayFlags.upayEnabled) list.push('upay');
    if (gatewayFlags.sslcommerzEnabled) list.push('sslcommerz');
    if (gatewayFlags.cardEnabled) list.push('card');
    return list;
  }, [gatewayFlags]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput.trim(), subtotal: cartSubtotal }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) {
      showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
      return;
    }
    setAppliedCoupon({ code: data.code, discount: data.discount });
    showToast(lang === 'bn' ? `কুপন ${data.code} প্রয়োগ হয়েছে` : `Coupon ${data.code} applied`, 'success');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayNotice(null);

    if (!fullName.trim() || !isValidBdPhone(phone) || !streetAddress.trim()) {
      showToast(
        lang === 'bn'
          ? 'নাম, সঠিক বাংলাদেশি মোবাইল নম্বর (01XXXXXXXXX) এবং ডেলিভারি ঠিকানা দিন।'
          : 'Please enter full name, valid BD mobile number (01XXXXXXXXX), and complete delivery address.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          customerName: fullName.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          district,
          upazila,
          deliveryArea: deliveryArea.trim(),
          streetAddress: streetAddress.trim(),
          orderNotes: orderNotes.trim(),
          paymentMethod,
          couponCode: appliedCoupon?.code || '',
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size,
            color: i.color,
          })),
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        const msg = lang === 'bn' ? data.errorBn || data.error : data.error;
        if (data.errorCode === 'GATEWAY_NOT_CONFIGURED' || data.errorCode === 'GATEWAY_REQUIRES_RSA_SIGNING') {
          setGatewayNotice(msg);
        }
        showToast(msg, 'error');
        return;
      }

      if (data.paymentMode === 'redirect' && data.redirectUrl) {
        clearCart();
        window.location.href = data.redirectUrl;
        return;
      }

      clearCart();
      navigate(`/order-confirmation/${encodeURIComponent(data.orderNumber)}`);
    } catch {
      showToast(lang === 'bn' ? 'অর্ডার প্রসেস করতে সমস্যা হয়েছে' : 'Order submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold">{t(UI_TEXT.cart.empty, lang)}</h1>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider"
        >
          {t(UI_TEXT.cart.continueShopping, lang)}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-1">
          ASVORE {lang === 'bn' ? 'সুরক্ষিত চেকআউট' : 'Secure Checkout'}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
          {t(UI_TEXT.checkout.title, lang)}
        </h1>
      </div>

      {!user && (
        <div className="mb-6 p-4 bg-[#F2EFE9] border border-[#111113]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <span>{t(UI_TEXT.checkout.guestNotice, lang)}</span>
          <Link to="/login" className="text-xs font-semibold uppercase tracking-wider underline whitespace-nowrap">
            {t(UI_TEXT.nav.login, lang)}
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Saved Addresses for Logged-in Users */}
          {savedAddresses.length > 0 && (
            <div className="bg-white border border-[#111113]/10 p-6 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111113]">
                {t(UI_TEXT.checkout.savedAddresses, lang)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setDistrict(addr.district);
                      setUpazila(addr.upazila);
                      setDeliveryArea(addr.deliveryArea || '');
                      setStreetAddress(addr.streetAddress);
                    }}
                    className="text-left p-3.5 border border-[#111113]/15 hover:border-[#B89352] text-xs space-y-1 cursor-pointer"
                  >
                    <p className="font-semibold text-[#111113]">
                      {addr.label || addr.district} · {addr.fullName}
                    </p>
                    <p className="text-[#5C5B57]">{addr.streetAddress}</p>
                    <p className="text-[#5C5B57] tabular-nums">{addr.phone}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Delivery Info */}
          <div className="bg-white border border-[#111113]/10 p-6 space-y-5">
            <h2 className="font-display text-2xl font-semibold text-[#111113]">
              {lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Details'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  {t(UI_TEXT.checkout.fullName, lang)} *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  {t(UI_TEXT.checkout.phone, lang)} *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352] tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t(UI_TEXT.checkout.email, lang)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  {t(UI_TEXT.checkout.district, lang)} *
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    const nextDist = e.target.value;
                    setDistrict(nextDist);
                    const found = BANGLADESH_DISTRICTS.find((d) => d.nameEn === nextDist);
                    if (found?.upazilas[0]) setUpazila(found.upazilas[0]);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d.nameEn} value={d.nameEn}>
                      {lang === 'bn' ? `${d.nameBn} (${d.nameEn})` : d.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                  {t(UI_TEXT.checkout.upazila, lang)} *
                </label>
                <select
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                >
                  {activeDistrictObj.upazilas.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t(UI_TEXT.checkout.deliveryArea, lang)}
              </label>
              <input
                type="text"
                value={deliveryArea}
                onChange={(e) => setDeliveryArea(e.target.value)}
                placeholder={lang === 'bn' ? 'যেমন: শাপলামিল, ডিবি রোড' : 'e.g. Shaplamill, DB Road'}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t(UI_TEXT.checkout.streetAddress, lang)} *
              </label>
              <textarea
                rows={2}
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder={lang === 'bn' ? 'বাসা নম্বর, রোড, এলাকা লিখুন' : 'House, road, landmark details'}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {t(UI_TEXT.checkout.notes, lang)}
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white border border-[#111113]/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-[#111113]">
                {t(UI_TEXT.checkout.paymentMethod, lang)}
              </h2>
              <span className="inline-flex items-center gap-1 text-xs text-[#5C5B57]">
                <Lock className="w-3.5 h-3.5 text-[#B89352]" />
                <span>{lang === 'bn' ? 'সার্ভার ভেরিফাইড' : 'Server Verified'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {enabledGateways.map((methodId) => {
                const info = PAYMENT_METHOD_LABELS[methodId];
                const selected = paymentMethod === methodId;
                return (
                  <button
                    key={methodId}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(methodId);
                      setGatewayNotice(null);
                    }}
                    className={`text-left p-4 border transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#111113] bg-[#FAF8F5] ring-1 ring-[#111113]'
                        : 'border-[#111113]/15 hover:border-[#B89352]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#111113]">
                        {lang === 'bn' ? info.bn : info.en}
                      </span>
                      {selected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#B89352] shrink-0" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-[#5C5B57] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#5C5B57] mt-1">{lang === 'bn' ? info.descBn : info.descEn}</p>
                  </button>
                );
              })}
            </div>

            {gatewayFlags.manualMfs?.[paymentMethod]?.enabled && (
              <div className="p-4 bg-[#FAF8F5] border border-[#B89352]/40 text-xs space-y-1.5">
                <p className="font-semibold text-[#111113]">
                  {gatewayFlags.manualMfs[paymentMethod].methodName || PAYMENT_METHOD_LABELS[paymentMethod].en} ·{' '}
                  <span className="font-mono-num">{gatewayFlags.manualMfs[paymentMethod].accountNumber}</span>
                </p>
                <p className="text-[#5C5B57]">
                  {lang === 'bn'
                    ? gatewayFlags.manualMfs[paymentMethod].instructionsBn
                    : gatewayFlags.manualMfs[paymentMethod].instructionsEn}
                </p>
              </div>
            )}

            {gatewayNotice && (
              <div className="p-4 bg-[#111113] text-[#FAF8F5] text-xs leading-relaxed border border-[#B89352]/40">
                {gatewayNotice}
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 bg-white border border-[#111113]/10 p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-semibold text-[#111113]">
            {lang === 'bn' ? 'আপনার অর্ডার' : 'Order Summary'}
          </h2>

          <div className="divide-y divide-[#111113]/8 max-h-72 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.size || ''}-${item.color || ''}`}
                className="py-3 flex justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#111113] truncate">
                    {lang === 'bn' ? item.nameBn : item.nameEn}
                  </p>
                  <p className="text-xs text-[#5C5B57] tabular-nums">
                    Qty {item.quantity} {[item.size, item.color].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="font-semibold tabular-nums shrink-0">
                  {formatBdt(item.unitPrice * item.quantity, lang)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#111113]/10">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t(UI_TEXT.cart.couponPlaceholder, lang)}
              className="flex-1 px-3 py-2 text-xs border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-2 text-xs font-semibold bg-[#111113] text-[#FAF8F5] cursor-pointer"
            >
              {t(UI_TEXT.cart.applyCoupon, lang)}
            </button>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] border border-[#111113]/8 flex items-center gap-3 text-xs">
            <Truck className="w-4 h-4 text-[#B89352] shrink-0" />
            <div>
              <p className="font-semibold text-[#111113]">
                {isInsideGaibandha
                  ? t(UI_TEXT.checkout.insideGaibandha, lang)
                  : t(UI_TEXT.checkout.outsideGaibandha, lang)}
              </p>
              <p className="text-[#5C5B57]">
                {lang === 'bn' ? 'সম্ভাব্য ডেলিভারি: ' : 'Estimated: '}
                {isInsideGaibandha ? shippingSettings.estimatedDaysInside : shippingSettings.estimatedDaysOutside}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-sm pt-2 border-t border-[#111113]/10">
            <div className="flex justify-between text-[#5C5B57]">
              <span>{t(UI_TEXT.cart.subtotal, lang)}</span>
              <span className="tabular-nums text-[#111113] font-medium">{formatBdt(cartSubtotal, lang)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-emerald-800">
                <span>
                  {t(UI_TEXT.cart.discount, lang)} ({appliedCoupon.code})
                </span>
                <span className="tabular-nums">-{formatBdt(appliedCoupon.discount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5C5B57]">
              <span>{t(UI_TEXT.cart.delivery, lang)}</span>
              <span className="tabular-nums text-[#111113]">{formatBdt(deliveryCharge, lang)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-[#5C5B57]">
                <span>{lang === 'bn' ? 'ভ্যাট/ট্যাক্স' : 'Tax'}</span>
                <span className="tabular-nums text-[#111113]">{formatBdt(taxAmount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-[#111113] pt-3 border-t border-[#111113]/10">
              <span>{t(UI_TEXT.cart.total, lang)}</span>
              <span className="tabular-nums">{formatBdt(grandTotal, lang)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-[0.16em] hover:bg-[#B89352] hover:text-[#111113] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting
              ? lang === 'bn'
                ? 'অর্ডার প্রসেস হচ্ছে...'
                : 'Processing Order...'
              : t(UI_TEXT.checkout.placeOrder, lang)}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#5C5B57]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B89352]" />
            <span>
              {lang === 'bn'
                ? 'মূল্য ও ডিসকাউন্ট সার্ভারের মাধ্যমে যাচাইকৃত'
                : 'All totals and payment verifications are validated server-side.'}
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
