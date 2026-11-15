import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { collection, onSnapshot, query, serverTimestamp, addDoc, where } from 'firebase/firestore';
import { useApp } from '../context/AppContext.tsx';
import { db } from '../lib/firebase.ts';
import { formatBdt, t, UI_TEXT } from '../lib/i18n.ts';
import type { Review } from '../types/index.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang, products, user, profile, addToCart, wishlistIds, toggleWishlist, showToast } = useApp();

  const product = useMemo(() => products.find((p) => p.slug === slug) || products[0], [products, slug]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedImage(0);
    setSelectedSize(product.sizes?.[0] || '');
    setSelectedColor(product.colors?.[0]?.nameEn || '');
    setQuantity(1);

    const q = query(collection(db, 'reviews'), where('productId', '==', product.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }))
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        setReviews(list);
      },
      () => {}
    );
    return () => unsub();
  }, [product]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg">{lang === 'bn' ? 'পণ্য পাওয়া যায়নি' : 'Product not found'}</p>
        <Link to="/shop" className="mt-4 inline-block underline">
          {t(UI_TEXT.cart.continueShopping, lang)}
        </Link>
      </div>
    );
  }

  const title = lang === 'bn' ? product.nameBn : product.nameEn;
  const description = lang === 'bn' ? product.descriptionBn : product.descriptionEn;
  const hasDiscount =
    product.discountPrice !== null && product.discountPrice > 0 && product.discountPrice < product.regularPrice;
  const activePrice = hasDiscount ? Number(product.discountPrice) : product.regularPrice;
  const discountPct = hasDiscount
    ? Math.round(((product.regularPrice - activePrice) / product.regularPrice) * 100)
    : 0;
  const isWished = wishlistIds.includes(product.id);

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);
  const recommendedProducts = products
    .filter((p) => p.id !== product.id && p.bestSeller)
    .slice(0, 4);

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (reviewComment.trim().length < 3) {
      showToast(lang === 'bn' ? 'অনুগ্রহ করে রিভিউ লিখুন' : 'Please write a short review', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product.id,
        userId: user.uid,
        userName: profile?.fullName || user.displayName || 'Verified Client',
        rating: reviewRating,
        comment: reviewComment.trim().slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      setReviewComment('');
      showToast(lang === 'bn' ? 'আপনার রিভিউ যুক্ত হয়েছে' : 'Review submitted', 'success');
    } catch {
      showToast(lang === 'bn' ? 'রিভিউ জমা দিতে ব্যর্থ হয়েছে' : 'Could not submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden border border-[#111113]/8 group">
            <ResilientImage
              src={product.images?.[selectedImage] || product.images?.[0]}
              alt={title}
              eager
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-[4/3] bg-[#F2EFE9] overflow-hidden border cursor-pointer ${
                    selectedImage === idx ? 'border-[#111113] ring-1 ring-[#111113]' : 'border-[#111113]/10 opacity-75'
                  }`}
                >
                  <ResilientImage src={img} alt={`${title} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2 border-b border-[#111113]/10 pb-5">
            <div className="flex items-center gap-2 text-xs text-[#5C5B57] uppercase tracking-wider">
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{t(UI_TEXT.product.sku, lang)}: {product.sku}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113] text-balance">
              {title}
            </h1>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1 text-[#B89352] text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-semibold text-[#111113] tabular-nums">{product.ratingAvg.toFixed(1)}</span>
              </div>
              <span className="text-xs text-[#5C5B57] tabular-nums">
                ({product.ratingCount + reviews.length} {lang === 'bn' ? 'টি রিভিউ' : 'reviews'})
              </span>
              <span aria-hidden="true" className="text-[#5C5B57]">·</span>
              <span className={`text-xs font-semibold ${product.stock > 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                {product.stock > 0
                  ? `${t(UI_TEXT.product.inStock, lang)} (${product.stock})`
                  : t(UI_TEXT.product.outOfStock, lang)}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 tabular-nums">
            <span className="text-2xl sm:text-3xl font-semibold text-[#111113]">
              {formatBdt(activePrice, lang)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-base text-[#5C5B57] line-through">
                  {formatBdt(product.regularPrice, lang)}
                </span>
                <span className="text-xs font-semibold text-[#B89352] uppercase">
                  -{discountPct}% {t(UI_TEXT.product.savePct, lang)}
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-[#5C5B57] leading-relaxed">{description}</p>

          {/* Variations: Size */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111113]">
                {t(UI_TEXT.product.size, lang)}: <span className="text-[#B89352]">{selectedSize}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedSize === size
                        ? 'bg-[#111113] text-[#FAF8F5] border-[#111113]'
                        : 'bg-white text-[#111113] border-[#111113]/15 hover:border-[#111113]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variations: Color */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111113]">
                {t(UI_TEXT.product.color, lang)}:{' '}
                <span className="text-[#B89352]">
                  {lang === 'bn'
                    ? product.colors.find((c) => c.nameEn === selectedColor)?.nameBn || selectedColor
                    : selectedColor}
                </span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.nameEn}
                    type="button"
                    onClick={() => setSelectedColor(c.nameEn)}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-xs border cursor-pointer ${
                      selectedColor === c.nameEn
                        ? 'border-[#111113] bg-white font-semibold'
                        : 'border-[#111113]/15 bg-white/60'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                    <span>{lang === 'bn' ? c.nameBn : c.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#111113]/20 bg-white h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-full flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 20, q + 1))}
                  className="w-11 h-full flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => addToCart(product, quantity, selectedSize, selectedColor)}
                className="flex-1 h-12 px-6 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#B89352] hover:text-[#111113] disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t(UI_TEXT.product.addToCart, lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => void toggleWishlist(product.id)}
                aria-label={t(UI_TEXT.nav.wishlist, lang)}
                className={`w-12 h-12 flex items-center justify-center border border-[#111113]/20 bg-white cursor-pointer ${
                  isWished ? 'text-[#B89352]' : 'text-[#111113]'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={handleBuyNow}
              className="w-full h-12 bg-[#B89352] text-[#111113] text-xs font-bold uppercase tracking-[0.16em] hover:bg-[#111113] hover:text-[#FAF8F5] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {t(UI_TEXT.product.buyNow, lang)}
            </button>
          </div>

          {/* Delivery & Guarantee */}
          <div className="pt-4 border-t border-[#111113]/10 space-y-2.5 text-xs text-[#5C5B57]">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#B89352] shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'গাইবান্ধার ভেতরে ৬০৳ (১–২ দিন) · সারাদেশে ১৩০৳ (২–৪ দিন)'
                  : 'Inside Gaibandha ৳60 (1–2 days) · Nationwide Bangladesh ৳130 (2–4 days)'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#B89352] shrink-0" />
              <span>
                {lang === 'bn'
                  ? '১০০% অরিজিনাল মান যাচাইকৃত পণ্য · ৭ দিনের সহজ রিটার্ন'
                  : '100% Authenticity Inspected · 7-Day Easy Exchange Guarantee'}
              </span>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="pt-4 border-t border-[#111113]/10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111113] mb-3">
                {t(UI_TEXT.product.specifications, lang)}
              </h2>
              <dl className="divide-y divide-[#111113]/8 text-sm">
                {product.specifications.map((spec, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#5C5B57]">{lang === 'bn' ? spec.labelBn : spec.labelEn}</dt>
                    <dd className="font-medium text-[#111113] text-right">
                      {lang === 'bn' ? spec.valueBn : spec.valueEn}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-16 pt-12 border-t border-[#111113]/10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#111113] mb-4">
            {t(UI_TEXT.product.writeReview, lang)}
          </h2>
          <form onSubmit={handleReviewSubmit} className="bg-white border border-[#111113]/10 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
                {lang === 'bn' ? 'রেটিং' : 'Rating'}
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className="p-1 cursor-pointer"
                  >
                    <Star className={`w-5 h-5 ${n <= reviewRating ? 'text-[#B89352] fill-current' : 'text-stone-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
                {lang === 'bn' ? 'আপনার মতামত' : 'Your Experience'}
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={lang === 'bn' ? 'পণ্যের মান ও ফিট সম্পর্কে লিখুন...' : 'Share feedback on quality and fit...'}
                className="w-full p-3 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
            >
              {user
                ? lang === 'bn'
                  ? 'রিভিউ জমা দিন'
                  : 'Submit Review'
                : lang === 'bn'
                  ? 'রিভিউ দিতে সাইন ইন করুন'
                  : 'Sign In to Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-display text-2xl font-semibold text-[#111113]">
            {t(UI_TEXT.product.reviews, lang)} ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-[#5C5B57] bg-white border border-[#111113]/8 p-6">
              {lang === 'bn'
                ? 'এই পণ্যের প্রথম রিভিউটি আপনিই লিখুন।'
                : 'Be the first verified client to review this piece.'}
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-[#111113]/8 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#111113]">{rev.userName}</span>
                    <div className="flex items-center gap-0.5 text-[#B89352]">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-[#5C5B57] leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related & Recommended */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-[#111113]/10">
          <h2 className="font-display text-3xl font-semibold text-[#111113] mb-8">
            {t(UI_TEXT.product.related, lang)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {recommendedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-[#111113]/10">
          <h2 className="font-display text-3xl font-semibold text-[#111113] mb-8">
            {t(UI_TEXT.product.recommended, lang)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
