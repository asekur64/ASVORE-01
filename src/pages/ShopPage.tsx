import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatBdt } from '../lib/i18n.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { Link } from 'react-router-dom';

export function ShopPage() {
  const { lang, products, categories, addToCart } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCat = searchParams.get('category') || 'all';
  const initialFilter = searchParams.get('filter') || '';
  const initialQuery = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [maxPrice, setMaxPrice] = useState(15000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc' | 'bestseller' | 'popular'>(
    initialFilter === 'bestseller' ? 'bestseller' : 'latest'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))), [products]);
  const sizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes || []))), [products]);
  const colors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => (p.colors || []).map((c) => c.nameEn)))),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (initialFilter === 'new' && !p.newArrival) return false;
      if (initialFilter === 'bestseller' && !p.bestSeller) return false;
      if (
        initialFilter === 'offers' &&
        !(p.discountPrice !== null && p.discountPrice > 0 && p.discountPrice < p.regularPrice)
      ) {
        return false;
      }
      if (q) {
        const hit =
          p.nameEn.toLowerCase().includes(q) ||
          p.nameBn.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      if (selectedSize !== 'all' && !(p.sizes || []).includes(selectedSize)) return false;
      if (selectedColor !== 'all' && !(p.colors || []).some((c) => c.nameEn === selectedColor)) return false;
      const effectivePrice = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.regularPrice;
      if (effectivePrice > maxPrice) return false;
      if (inStockOnly && p.stock <= 0) return false;
      if (p.ratingAvg < minRating) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const priceA = a.discountPrice && a.discountPrice > 0 ? a.discountPrice : a.regularPrice;
      const priceB = b.discountPrice && b.discountPrice > 0 ? b.discountPrice : b.regularPrice;
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'bestseller') return (b.soldCount || 0) - (a.soldCount || 0);
      if (sortBy === 'popular') return b.ratingCount - a.ratingCount;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    return list;
  }, [
    products,
    selectedCategory,
    initialFilter,
    searchTerm,
    selectedBrand,
    selectedSize,
    selectedColor,
    maxPrice,
    inStockOnly,
    minRating,
    sortBy,
  ]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setSelectedBrand('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setMaxPrice(15000);
    setInStockOnly(false);
    setMinRating(0);
    setSearchParams({});
  };

  const FilterPanel = (
    <div className="space-y-6 text-sm">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111113] mb-3">
          {lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`block w-full text-left py-1.5 px-2.5 text-sm cursor-pointer ${
              selectedCategory === 'all' ? 'bg-[#111113] text-[#FAF8F5] font-medium' : 'text-[#5C5B57] hover:text-[#111113]'
            }`}
          >
            {lang === 'bn' ? 'সকল পণ্য' : 'All Products'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`block w-full text-left py-1.5 px-2.5 text-sm cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-[#111113] text-[#FAF8F5] font-medium'
                  : 'text-[#5C5B57] hover:text-[#111113]'
              }`}
            >
              {lang === 'bn' ? cat.nameBn : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider mb-2">
          <span>{lang === 'bn' ? 'সর্বোচ্চ মূল্য' : 'Max Price'}</span>
          <span className="tabular-nums text-[#B89352]">{formatBdt(maxPrice, lang)}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={15000}
          step={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#111113]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
          {lang === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
        </label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#111113]/15 text-sm"
        >
          <option value="all">{lang === 'bn' ? 'সকল ব্র্যান্ড' : 'All Brands'}</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
          {lang === 'bn' ? 'সাইজ' : 'Size'}
        </label>
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#111113]/15 text-sm"
        >
          <option value="all">{lang === 'bn' ? 'সব সাইজ' : 'All Sizes'}</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
          {lang === 'bn' ? 'রঙ' : 'Color'}
        </label>
        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#111113]/15 text-sm"
        >
          <option value="all">{lang === 'bn' ? 'সব রঙ' : 'All Colors'}</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">
          {lang === 'bn' ? 'ন্যূনতম রেটিং' : 'Customer Rating'}
        </label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="w-full px-3 py-2 bg-white border border-[#111113]/15 text-sm"
        >
          <option value={0}>{lang === 'bn' ? 'সব রেটিং' : 'All Ratings'}</option>
          <option value={4}>4★ & Above</option>
          <option value={4.5}>4.5★ & Above</option>
        </select>
      </div>

      <label className="flex items-center gap-2.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="accent-[#111113]"
        />
        <span>{lang === 'bn' ? 'শুধুমাত্র স্টকে আছে' : 'In Stock Only'}</span>
      </label>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#111113]/20 hover:bg-[#111113] hover:text-[#FAF8F5] transition-colors cursor-pointer"
      >
        {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#111113]/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-1">
            ASVORE {lang === 'bn' ? 'ক্যাটালগ' : 'Catalog'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
            {lang === 'bn' ? 'পুরুষদের ফ্যাশন ও এক্সেসরিজ' : "Men's Fashion & Accessories"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'bn' ? 'নাম বা SKU দিয়ে খুঁজুন...' : 'Filter by name or SKU...'}
            className="px-3.5 py-2 text-sm bg-white border border-[#111113]/15 focus:outline-none focus:border-[#B89352] w-56"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort products"
            className="px-3 py-2 text-sm bg-white border border-[#111113]/15"
          >
            <option value="latest">{lang === 'bn' ? 'সর্বশেষ পণ্য' : 'Latest Products'}</option>
            <option value="price_asc">{lang === 'bn' ? 'কম থেকে বেশি দাম' : 'Price: Low to High'}</option>
            <option value="price_desc">{lang === 'bn' ? 'বেশি থেকে কম দাম' : 'Price: High to Low'}</option>
            <option value="bestseller">{lang === 'bn' ? 'সর্বাধিক বিক্রিত' : 'Best Selling'}</option>
            <option value="popular">{lang === 'bn' ? 'সবচেয়ে জনপ্রিয়' : 'Most Popular'}</option>
          </select>

          <div className="inline-flex border border-[#111113]/15 bg-white">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 cursor-pointer ${viewMode === 'grid' ? 'bg-[#111113] text-[#FAF8F5]' : 'text-[#5C5B57]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 cursor-pointer ${viewMode === 'list' ? 'bg-[#111113] text-[#FAF8F5]' : 'text-[#5C5B57]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#111113]/15"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">{FilterPanel}</aside>

        <div className="lg:col-span-9">
          <p className="text-xs text-[#5C5B57] mb-5 tabular-nums">
            {lang === 'bn'
              ? `মোট ${filteredProducts.length}টি পণ্য পাওয়া গেছে`
              : `Showing ${filteredProducts.length} pieces`}
          </p>

          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center bg-white border border-[#111113]/8 p-8">
              <p className="text-base font-medium text-[#111113] mb-2">
                {lang === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No matching pieces found'}
              </p>
              <p className="text-sm text-[#5C5B57] mb-6">
                {lang === 'bn'
                  ? 'অনুগ্রহ করে অন্য ফিল্টার বা কীওয়ার্ড চেষ্টা করুন।'
                  : 'Try adjusting your filters or search criteria.'}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                {lang === 'bn' ? 'সব ফিল্টার মুছুন' : 'Clear All Filters'}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((p) => {
                const title = lang === 'bn' ? p.nameBn : p.nameEn;
                const price = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.regularPrice;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row gap-5 bg-white border border-[#111113]/8 p-4"
                  >
                    <Link to={`/product/${p.slug}`} className="sm:w-52 aspect-[4/3] bg-[#F2EFE9] shrink-0 overflow-hidden">
                      <ResilientImage src={p.images?.[0]} alt={title} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#5C5B57] uppercase tracking-wider">
                          {p.brand} · {p.sku}
                        </p>
                        <Link
                          to={`/product/${p.slug}`}
                          className="text-lg font-semibold text-[#111113] hover:text-[#B89352] mt-1 block"
                        >
                          {title}
                        </Link>
                        <p className="text-sm text-[#5C5B57] mt-2 line-clamp-2">
                          {lang === 'bn' ? p.descriptionBn : p.descriptionEn}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-[#111113]/8">
                        <div className="flex items-baseline gap-2 tabular-nums">
                          <span className="text-base font-semibold">{formatBdt(price, lang)}</span>
                          {p.discountPrice && p.discountPrice < p.regularPrice && (
                            <span className="text-xs text-[#5C5B57] line-through">
                              {formatBdt(p.regularPrice, lang)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={p.stock <= 0}
                          onClick={() => addToCart(p, 1)}
                          className="px-4 py-2 text-xs font-semibold bg-[#111113] text-[#FAF8F5] hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
                        >
                          {lang === 'bn' ? 'ব্যাগে যোগ করুন' : 'Add to Bag'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div onClick={() => setMobileFiltersOpen(false)} className="fixed inset-0 bg-[#111113]/50" />
          <div className="relative z-10 w-80 max-w-[85vw] bg-[#FAF8F5] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#111113]/10">
              <span className="font-semibold text-base">{lang === 'bn' ? 'ফিল্টারসমূহ' : 'Filters'}</span>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
