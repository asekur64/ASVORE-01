import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt, t, UI_TEXT } from '../lib/i18n.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function Header() {
  const {
    lang,
    toggleLang,
    user,
    isAdmin,
    categories,
    products,
    cartCount,
    setCartOpen,
    wishlistIds,
    unreadNotificationsCount,
    siteSettings,
  } = useApp();

  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopMenuOpen, setShopMenuOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          (p.nameEn || '').toLowerCase().includes(q) ||
          (p.nameBn || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#111113]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center text-[#111113] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-2xl sm:text-[26px] font-bold tracking-[0.14em] text-[#111113] whitespace-nowrap shrink-0"
          >
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.websiteName || siteSettings.companyName || 'ASVORE'}
                className="h-8 w-auto object-contain"
              />
            ) : null}
            <span>{siteSettings.websiteName || siteSettings.companyName || 'ASVORE'}</span>
          </Link>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#111113]/80">
          {siteSettings.headerMenu && siteSettings.headerMenu.length > 0 ? (
            siteSettings.headerMenu.map((item, idx) => (
              <Link
                key={`${item.href}-${idx}`}
                to={item.href || '/'}
                className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
              >
                {lang === 'bn' ? item.labelBn || item.labelEn : item.labelEn}
              </Link>
            ))
          ) : (
            <>
              <Link to="/" className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0">
                {t(UI_TEXT.nav.home, lang)}
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setShopMenuOpen(true)}
                onMouseLeave={() => setShopMenuOpen(false)}
              >
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1 hover:text-[#111113] transition-colors whitespace-nowrap shrink-0 py-2"
                >
                  <span>{t(UI_TEXT.nav.shop, lang)}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </Link>
                {shopMenuOpen && (
                  <div className="absolute left-0 top-full w-64 bg-white border border-[#111113]/10 shadow-xl py-2 z-50">
                    <Link
                      to="/shop"
                      onClick={() => setShopMenuOpen(false)}
                      className="block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#B89352] hover:bg-[#FAF8F5]"
                    >
                      {lang === 'bn' ? 'সকল পণ্য দেখুন' : 'View All Products'}
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/shop?category=${cat.slug}`}
                        onClick={() => setShopMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-[#111113] hover:bg-[#FAF8F5] transition-colors"
                      >
                        {lang === 'bn' ? cat.nameBn : cat.nameEn}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/shop?category=mens-clothing"
                className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
              >
                {t(UI_TEXT.nav.clothing, lang)}
              </Link>
              <Link
                to="/shop?category=watches"
                className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
              >
                {t(UI_TEXT.nav.watches, lang)}
              </Link>
              <Link
                to="/shop?category=accessories"
                className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
              >
                {t(UI_TEXT.nav.accessories, lang)}
              </Link>
              <Link
                to="/shop?filter=new"
                className="hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
              >
                {t(UI_TEXT.nav.newArrivals, lang)}
              </Link>
              <Link
                to="/shop?filter=offers"
                className="hover:text-[#B89352] transition-colors whitespace-nowrap shrink-0"
              >
                {t(UI_TEXT.nav.offers, lang)}
              </Link>
            </>
          )}
        </nav>

        {/* Zone 3: Functional Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="w-10 h-10 flex items-center justify-center text-[#111113] hover:text-[#B89352] transition-colors cursor-pointer"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={toggleLang}
            className="px-2.5 py-1.5 text-xs font-semibold border border-[#111113]/15 text-[#111113] hover:border-[#B89352] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === 'bn' ? 'EN' : 'বাংলা'}
          </button>

          <Link
            to="/wishlist"
            aria-label={t(UI_TEXT.nav.wishlist, lang)}
            className="hidden sm:flex relative w-10 h-10 items-center justify-center text-[#111113] hover:text-[#B89352] transition-colors"
          >
            <Heart className="w-[18px] h-[18px]" />
            {wishlistIds.length > 0 && (
              <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 bg-[#B89352] text-[#111113] text-[10px] font-bold flex items-center justify-center tabular-nums">
                {wishlistIds.length}
              </span>
            )}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t(UI_TEXT.nav.admin, lang)}</span>
            </Link>
          )}

          <Link
            to={user ? '/dashboard' : '/login'}
            aria-label={t(UI_TEXT.nav.account, lang)}
            className="relative w-10 h-10 flex items-center justify-center text-[#111113] hover:text-[#B89352] transition-colors"
          >
            <User className="w-[18px] h-[18px]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 bg-[#111113] text-[#FAF8F5] text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t(UI_TEXT.nav.cart, lang)}
            className="relative inline-flex items-center gap-1.5 px-3 py-2 bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tabular-nums">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar with Live Suggestions */}
      {searchOpen && (
        <div className="border-t border-[#111113]/10 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <Search className="w-4 h-4 text-[#5C5B57] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(UI_TEXT.nav.searchPlaceholder, lang)}
                className="w-full py-2 text-sm text-[#111113] bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-[#111113] text-[#FAF8F5] whitespace-nowrap cursor-pointer"
              >
                {lang === 'bn' ? 'খুঁজুন' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2 text-[#5C5B57] hover:text-[#111113] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            {suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#111113]/10 divide-y divide-[#111113]/6">
                {suggestions.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 py-2.5 hover:bg-[#FAF8F5] px-2 transition-colors"
                  >
                    <div className="w-11 h-11 bg-[#F2EFE9] shrink-0 overflow-hidden">
                      <ResilientImage
                        src={p.images?.[0]}
                        alt={lang === 'bn' ? p.nameBn : p.nameEn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111113] truncate">
                        {lang === 'bn' ? p.nameBn : p.nameEn}
                      </p>
                      <p className="text-xs text-[#5C5B57]">{p.sku}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBdt(p.discountPrice ?? p.regularPrice, lang)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-[#111113]/50" />
          <div className="relative z-10 w-80 max-w-[85vw] bg-[#FAF8F5] h-full p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#111113]/10">
                <span className="font-display text-2xl font-bold tracking-[0.14em]">ASVORE</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-col divide-y divide-[#111113]/8 text-sm font-medium">
                <Link to="/" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.home, lang)}
                </Link>
                <Link to="/shop" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.shop, lang)}
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/shop?category=${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 pl-3 text-[#5C5B57]"
                  >
                    {lang === 'bn' ? c.nameBn : c.nameEn}
                  </Link>
                ))}
                <Link to="/shop?filter=new" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.newArrivals, lang)}
                </Link>
                <Link to="/shop?filter=bestseller" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.bestSellers, lang)}
                </Link>
                <Link to="/shop?filter=offers" onClick={() => setMobileOpen(false)} className="py-3 text-[#B89352]">
                  {t(UI_TEXT.nav.offers, lang)}
                </Link>
                <Link to="/track-order" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.trackOrder, lang)}
                </Link>
                <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="py-3">
                  {t(UI_TEXT.nav.wishlist, lang)} ({wishlistIds.length})
                </Link>
                <Link to={user ? '/dashboard' : '/login'} onClick={() => setMobileOpen(false)} className="py-3">
                  {user ? t(UI_TEXT.nav.account, lang) : t(UI_TEXT.nav.login, lang)}
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="py-3 font-semibold text-[#B89352]">
                    {t(UI_TEXT.nav.admin, lang)}
                  </Link>
                )}
              </div>
            </div>
            <div className="pt-6 border-t border-[#111113]/10 text-xs text-[#5C5B57]">
              <p>{siteSettings.contactNumber}</p>
              <p className="mt-1">{lang === 'bn' ? siteSettings.addressBn : siteSettings.addressEn}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
