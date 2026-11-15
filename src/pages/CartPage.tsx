import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt, t, UI_TEXT } from '../lib/i18n.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';

export function CartPage() {
  const { lang, cart, cartSubtotal, updateCartQty, removeFromCart, shippingSettings, showToast } = useApp();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('outside');

  const deliveryFee =
    shippingSettings.freeShippingThreshold > 0 &&
    cartSubtotal - (appliedCoupon?.discount || 0) >= shippingSettings.freeShippingThreshold
      ? 0
      : deliveryZone === 'inside'
        ? shippingSettings.insideGaibandhaCharge
        : shippingSettings.outsideGaibandhaCharge;

  const grandTotal = Math.max(0, cartSubtotal - (appliedCoupon?.discount || 0) + deliveryFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
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
    showToast(
      lang === 'bn' ? `কুপন ${data.code} প্রয়োগ হয়েছে` : `Coupon ${data.code} applied`,
      'success'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113] mb-8">
        {t(UI_TEXT.cart.title, lang)}
      </h1>

      {cart.length === 0 ? (
        <div className="bg-white border border-[#111113]/10 p-12 text-center space-y-4">
          <p className="text-base text-[#5C5B57]">{t(UI_TEXT.cart.empty, lang)}</p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider"
          >
            {t(UI_TEXT.cart.continueShopping, lang)}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white border border-[#111113]/10 divide-y divide-[#111113]/8">
            {cart.map((item) => {
              const name = lang === 'bn' ? item.nameBn : item.nameEn;
              return (
                <div
                  key={`${item.productId}-${item.size || ''}-${item.color || ''}`}
                  className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="w-24 h-20 bg-[#F2EFE9] shrink-0 overflow-hidden">
                    <ResilientImage src={item.image} alt={name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.slug}`} className="font-semibold text-[#111113] hover:text-[#B89352]">
                      {name}
                    </Link>
                    <p className="text-xs text-[#5C5B57] mt-1">
                      {[item.sku, item.size, item.color].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-sm font-medium mt-1 tabular-nums">{formatBdt(item.unitPrice, lang)}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="inline-flex items-center border border-[#111113]/15">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.quantity - 1, item.size, item.color)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.quantity + 1, item.size, item.color)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold w-24 text-right tabular-nums">
                      {formatBdt(item.unitPrice * item.quantity, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.size, item.color)}
                      className="text-[#5C5B57] hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4 bg-white border border-[#111113]/10 p-6 space-y-5">
            <h2 className="font-display text-2xl font-semibold text-[#111113]">
              {lang === 'bn' ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary'}
            </h2>

            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t(UI_TEXT.cart.couponPlaceholder, lang)}
                className="flex-1 px-3 py-2 text-xs border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-[#111113] text-[#FAF8F5] cursor-pointer"
              >
                {t(UI_TEXT.cart.applyCoupon, lang)}
              </button>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C5B57]">
                {lang === 'bn' ? 'ডেলিভারি এলাকা' : 'Delivery Estimate'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryZone('inside')}
                  className={`py-2 px-2.5 border cursor-pointer ${
                    deliveryZone === 'inside'
                      ? 'bg-[#111113] text-[#FAF8F5] border-[#111113]'
                      : 'border-[#111113]/15'
                  }`}
                >
                  {t(UI_TEXT.checkout.insideGaibandha, lang)} ({formatBdt(shippingSettings.insideGaibandhaCharge, lang)})
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryZone('outside')}
                  className={`py-2 px-2.5 border cursor-pointer ${
                    deliveryZone === 'outside'
                      ? 'bg-[#111113] text-[#FAF8F5] border-[#111113]'
                      : 'border-[#111113]/15'
                  }`}
                >
                  {t(UI_TEXT.checkout.outsideGaibandha, lang)} ({formatBdt(shippingSettings.outsideGaibandhaCharge, lang)})
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-sm pt-3 border-t border-[#111113]/10">
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
                <span className="tabular-nums text-[#111113]">{formatBdt(deliveryFee, lang)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#111113] pt-2 border-t border-[#111113]/10">
                <span>{t(UI_TEXT.cart.total, lang)}</span>
                <span className="tabular-nums">{formatBdt(grandTotal, lang)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/checkout', {
                  state: { couponCode: appliedCoupon?.code || '', couponDiscount: appliedCoupon?.discount || 0 },
                })
              }
              className="w-full py-3.5 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
            >
              {t(UI_TEXT.cart.proceedCheckout, lang)}
            </button>
            <Link
              to="/shop"
              className="block text-center text-xs text-[#5C5B57] hover:text-[#111113] underline"
            >
              {t(UI_TEXT.cart.continueShopping, lang)}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
