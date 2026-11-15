import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { t, UI_TEXT } from '../lib/i18n.ts';

export function WishlistPage() {
  const { lang, products, wishlistIds } = useApp();
  const saved = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-1">ASVORE</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
          {t(UI_TEXT.nav.wishlist, lang)} ({saved.length})
        </h1>
      </div>

      {saved.length === 0 ? (
        <div className="bg-white border border-[#111113]/10 p-12 text-center space-y-4">
          <Heart className="w-10 h-10 text-[#5C5B57]/40 mx-auto stroke-[1.25]" />
          <p className="text-sm text-[#5C5B57]">
            {lang === 'bn' ? 'আপনার উইশলিস্টে কোনো পণ্য সংরক্ষিত নেই।' : 'Your wishlist is currently empty.'}
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider"
          >
            {t(UI_TEXT.cart.continueShopping, lang)}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
