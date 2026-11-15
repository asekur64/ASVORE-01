import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt, t, UI_TEXT } from '../lib/i18n.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function CartDrawer() {
  const {
    lang,
    cart,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    shippingSettings,
  } = useApp();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-[#111113]/50 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[#FAF8F5] h-full flex flex-col border-l border-[#111113]/10 shadow-2xl"
            aria-label={t(UI_TEXT.cart.title, lang)}
          >
            <div className="px-6 py-5 border-b border-[#111113]/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#B89352]" />
                <h2 className="font-display text-2xl font-semibold text-[#111113]">
                  {t(UI_TEXT.cart.title, lang)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close bag"
                className="w-10 h-10 flex items-center justify-center text-[#111113] hover:bg-[#111113]/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-[#5C5B57]/40 mx-auto mb-3 stroke-[1.25]" />
                  <p className="text-sm text-[#5C5B57] mb-5">{t(UI_TEXT.cart.empty, lang)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/shop');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
                  >
                    {t(UI_TEXT.cart.continueShopping, lang)}
                  </button>
                </div>
              ) : (
                cart.map((item) => {
                  const name = lang === 'bn' ? item.nameBn : item.nameEn;
                  return (
                    <div
                      key={`${item.productId}-${item.size || ''}-${item.color || ''}`}
                      className="flex gap-4 pb-4 border-b border-[#111113]/8"
                    >
                      <div className="w-20 h-20 bg-[#F2EFE9] shrink-0 overflow-hidden">
                        <ResilientImage src={item.image} alt={name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#111113] truncate">{name}</h3>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.size, item.color)}
                            aria-label="Remove item"
                            className="text-[#5C5B57] hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(item.size || item.color) && (
                          <p className="text-xs text-[#5C5B57] mt-0.5">
                            {[item.size, item.color].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#111113]/15 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(item.productId, item.quantity - 1, item.size, item.color)
                              }
                              aria-label="Decrease quantity"
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(item.productId, item.quantity + 1, item.size, item.color)
                              }
                              aria-label="Increase quantity"
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-[#111113] tabular-nums">
                            {formatBdt(item.unitPrice * item.quantity, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-[#111113]/10 bg-white space-y-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#5C5B57]">
                    <span>{t(UI_TEXT.cart.subtotal, lang)}</span>
                    <span className="font-semibold text-[#111113] tabular-nums">
                      {formatBdt(cartSubtotal, lang)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#5C5B57]">
                    <span>{t(UI_TEXT.cart.delivery, lang)}</span>
                    <span className="tabular-nums">
                      {formatBdt(shippingSettings.insideGaibandhaCharge, lang)} –{' '}
                      {formatBdt(shippingSettings.outsideGaibandhaCharge, lang)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/cart');
                    }}
                    className="py-3 px-4 text-xs font-semibold uppercase tracking-wider border border-[#111113]/20 text-[#111113] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'ব্যাগ দেখুন' : 'View Bag'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
                  >
                    {t(UI_TEXT.cart.proceedCheckout, lang)}
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
