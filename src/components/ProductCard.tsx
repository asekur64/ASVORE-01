import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt, t, UI_TEXT } from '../lib/i18n.ts';
import type { Product } from '../types/index.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function ProductCard({ product }: { product: Product }) {
  const { lang, addToCart, wishlistIds, toggleWishlist } = useApp();
  const isWished = wishlistIds.includes(product.id);
  const title = lang === 'bn' ? product.nameBn : product.nameEn;
  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.regularPrice;
  const activePrice = hasDiscount ? Number(product.discountPrice) : product.regularPrice;
  const discountPct = hasDiscount
    ? Math.round(((product.regularPrice - activePrice) / product.regularPrice) * 100)
    : 0;

  return (
    <article className="group flex flex-col bg-white border border-[#111113]/8 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-14px_rgba(17,17,19,0.16)]">
      <div className="relative aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <ResilientImage
            src={product.images?.[0]}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        <button
          type="button"
          onClick={() => void toggleWishlist(product.id)}
          aria-label={t(UI_TEXT.nav.wishlist, lang)}
          className={`absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-[#111113]/10 transition-colors cursor-pointer ${
            isWished ? 'text-[#B89352]' : 'text-[#111113] hover:text-[#B89352]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
        </button>

        {product.stock <= 0 ? (
          <span className="absolute bottom-3 left-3 bg-[#111113] text-[#FAF8F5] text-[11px] font-medium px-2.5 py-1 tracking-wide">
            {t(UI_TEXT.product.outOfStock, lang)}
          </span>
        ) : hasDiscount ? (
          <span className="absolute bottom-3 left-3 bg-[#111113] text-[#FAF8F5] text-[11px] font-medium px-2.5 py-1 tabular-nums">
            -{discountPct}% {t(UI_TEXT.product.savePct, lang)}
          </span>
        ) : null}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5C5B57] mb-1">
            <span className="uppercase tracking-wider">{product.brand || 'ASVORE'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{Number(product.ratingAvg ?? 5).toFixed(1)} ★</span>
          </div>
          <Link
            to={`/product/${product.slug}`}
            className="block text-[15px] font-semibold text-[#111113] hover:text-[#B89352] transition-colors line-clamp-1"
          >
            {title}
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#111113]/6">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-semibold text-[#111113]">
              {formatBdt(activePrice, lang)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#5C5B57] line-through">
                {formatBdt(product.regularPrice, lang)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => addToCart(product, 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t(UI_TEXT.product.addToCart, lang)}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
