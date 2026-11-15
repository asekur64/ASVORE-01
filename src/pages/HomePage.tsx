import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Facebook, Shield, Sparkles, Star, Truck } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { db } from '../lib/firebase.ts';
import { t, UI_TEXT } from '../lib/i18n.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';

export function HomePage() {
  const { lang, products, categories, siteSettings, catalogLoading, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'new' | 'bestseller' | 'trending' | 'offers'>('new');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);

  const tabProducts = products.filter((p) => {
    if (activeTab === 'new') return p.newArrival;
    if (activeTab === 'bestseller') return p.bestSeller;
    if (activeTab === 'trending') return p.trending;
    return p.discountPrice !== null && p.discountPrice > 0 && p.discountPrice < p.regularPrice;
  });

  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 4);
  const offersList = products
    .filter((p) => p.discountPrice !== null && p.discountPrice > 0 && p.discountPrice < p.regularPrice)
    .slice(0, 4);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast(lang === 'bn' ? 'সঠিক ইমেইল ঠিকানা লিখুন' : 'Please enter a valid email address', 'error');
      return;
    }
    setSubmittingNews(true);
    try {
      const subId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      await setDoc(doc(db, 'subscribers', subId), {
        email: cleanEmail,
        createdAt: serverTimestamp(),
      });
      setNewsletterEmail('');
      showToast(
        lang === 'bn' ? 'আসভোর প্রাইভেট আপডেটে সাবস্ক্রাইব সম্পন্ন হয়েছে' : 'Subscribed to ASVORE Private Dispatch',
        'success'
      );
    } catch {
      showToast(
        lang === 'bn' ? 'সাবস্ক্রাইব করতে সমস্যা হয়েছে' : 'Could not complete subscription right now',
        'error'
      );
    } finally {
      setSubmittingNews(false);
    }
  };

  return (
    <div>
      {/* 1. Hero Banner */}
      <section className="relative bg-[#111113] text-[#FAF8F5] overflow-hidden">
        <div className="absolute inset-0">
          <ResilientImage
            src={siteSettings.hero.bannerImage}
            alt="ASVORE Luxury Men's Fashion"
            eager
            className="w-full h-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111113]/90 via-[#111113]/60 to-[#111113]/20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl space-y-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A461]">
              {lang === 'bn' ? siteSettings.hero.badgeBn : siteSettings.hero.badgeEn}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-balance">
              {lang === 'bn' ? siteSettings.hero.headlineBn : siteSettings.hero.headlineEn}
            </h1>
            <p className="text-base sm:text-lg text-[#FAF8F5]/80 leading-relaxed max-w-xl">
              {lang === 'bn' ? siteSettings.hero.subheadlineBn : siteSettings.hero.subheadlineEn}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#C9A461] text-[#111113] text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
              >
                <span>{lang === 'bn' ? siteSettings.hero.primaryCtaBn : siteSettings.hero.primaryCtaEn}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop?filter=new"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#FAF8F5]/35 text-[#FAF8F5] text-xs font-semibold uppercase tracking-[0.15em] hover:border-[#C9A461] hover:text-[#C9A461] transition-colors whitespace-nowrap"
              >
                <span>{lang === 'bn' ? siteSettings.hero.secondaryCtaBn : siteSettings.hero.secondaryCtaEn}</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-2">
              {lang === 'bn' ? 'আসভোর কালেকশন' : 'Department Directory'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
              {t(UI_TEXT.home.featuredCategories, lang)}
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold uppercase tracking-wider text-[#111113] hover:text-[#B89352] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{t(UI_TEXT.home.viewAll, lang)}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.slug}`}
              className="group block bg-white border border-[#111113]/8 hover:border-[#B89352] transition-colors"
            >
              <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={lang === 'bn' ? cat.nameBn : cat.nameEn}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-3.5 text-center">
                <h3 className="text-sm font-semibold text-[#111113] group-hover:text-[#B89352] transition-colors truncate">
                  {lang === 'bn' ? cat.nameBn : cat.nameEn}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Curated Collections Switcher (New Arrivals / Best Sellers / Trending / Special Offers) */}
      <section className="bg-[#F2EFE9]/70 border-y border-[#111113]/8 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-2">
                {lang === 'bn' ? 'নির্বাচিত সংগ্রহ' : 'Seasonal Edit'}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
                {t(UI_TEXT.home.featuredCollections, lang)}
              </h2>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-[#111113]/10">
              {(
                [
                  { id: 'new', label: UI_TEXT.home.newArrivals },
                  { id: 'bestseller', label: UI_TEXT.home.bestSellers },
                  { id: 'trending', label: UI_TEXT.home.trending },
                  { id: 'offers', label: UI_TEXT.home.specialOffers },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#111113] text-[#FAF8F5]'
                      : 'text-[#5C5B57] hover:text-[#111113]'
                  }`}
                >
                  {t(tab.label, lang)}
                </button>
              ))}
            </div>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white h-80 animate-pulse border border-[#111113]/8" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(tabProducts.length > 0 ? tabProducts : products).slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Best Selling Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-2">
              {lang === 'bn' ? 'সবচেয়ে পছন্দের' : 'Most Requested'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
              {t(UI_TEXT.home.bestSellers, lang)}
            </h2>
          </div>
          <Link
            to="/shop?filter=bestseller"
            className="text-xs font-semibold uppercase tracking-wider text-[#111113] hover:text-[#B89352] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{t(UI_TEXT.home.viewAll, lang)}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 5. Promotional Craftsmanship Banner */}
      {siteSettings.promoBanner.enabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#111113] text-[#FAF8F5] overflow-hidden">
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A461]">
                {lang === 'bn' ? 'বিশেষ অফার ও গিফট এডিশন' : 'Atelier Privilege'}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight text-balance">
                {lang === 'bn' ? siteSettings.promoBanner.textBn : siteSettings.promoBanner.textEn}
              </h2>
              <p className="text-sm text-[#FAF8F5]/75 leading-relaxed">
                {lang === 'bn' ? siteSettings.promoBanner.subtextBn : siteSettings.promoBanner.subtextEn}
              </p>
              <div className="pt-2">
                <Link
                  to={siteSettings.promoBanner.ctaLink || '/shop'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9A461] text-[#111113] text-xs font-bold uppercase tracking-wider hover:bg-[#FAF8F5] transition-colors"
                >
                  <span>
                    {lang === 'bn' ? siteSettings.promoBanner.ctaLabelBn : siteSettings.promoBanner.ctaLabelEn}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 min-h-[260px] lg:min-h-[380px]">
              <ResilientImage
                src={siteSettings.promoBanner.bannerImage}
                alt="ASVORE Craftsmanship"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* 6. Special Offers & Discounts */}
      {offersList.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-2">
                {lang === 'bn' ? 'সীমিত সময়ের মূল্যছাড়' : 'Limited Privilege Pricing'}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
                {t(UI_TEXT.home.specialOffers, lang)}
              </h2>
            </div>
            <Link
              to="/shop?filter=offers"
              className="text-xs font-semibold uppercase tracking-wider text-[#111113] hover:text-[#B89352] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>{t(UI_TEXT.home.viewAll, lang)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {offersList.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Why Choose ASVORE + Client Testimonials (Claim-to-Proof Adjacency) */}
      <section className="bg-white border-y border-[#111113]/8 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div>
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352] mb-2">
                {lang === 'bn' ? 'আসভোরের প্রতিশ্রুতি' : 'The ASVORE Standard'}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
                {t(UI_TEXT.home.whyChoose, lang)}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Sparkles,
                  titleEn: 'Curated Luxury Materials',
                  titleBn: 'উৎকৃষ্ট মানের উপাদান',
                  descEn: 'Full-grain cowhide, Egyptian cotton-silk, and 316L stainless steel inspected by hand.',
                  descBn: 'ফুল-গ্রেইন লেদার, ইজিপশিয়ান কটন-সিল্ক ও ৩১৬এল স্টেইনলেস স্টিলের হাতে বাছাইকৃত পণ্য।',
                },
                {
                  icon: Truck,
                  titleEn: 'Gaibandha & Nationwide Express',
                  titleBn: 'গাইবান্ধা ও সারাদেশে ডেলিভারি',
                  descEn: '৳60 inside Gaibandha (1–2 days) and ৳130 across all 64 districts of Bangladesh.',
                  descBn: 'গাইবান্ধায় মাত্র ৬০৳ (১–২ দিন) এবং বাংলাদেশের ৬৪ জেলায় ১৩০৳ ডেলিভারি চার্জ।',
                },
                {
                  icon: Shield,
                  titleEn: 'Verified BD Payment Security',
                  titleBn: 'নিরাপদ পেমেন্ট ও সিওডি',
                  descEn: 'Pay via Cash on Delivery, bKash, Nagad, Rocket, Upay, or SSLCommerz cards.',
                  descBn: 'ক্যাশ অন ডেলিভারি, বিকাশ, নগদ, রকেট, উপায় ও কার্ড পেমেন্টের সম্পূর্ণ নিরাপত্তা।',
                },
                {
                  icon: Check,
                  titleEn: '7-Day Seamless Exchange',
                  titleBn: '৭ দিনের সহজ এক্সচেঞ্জ',
                  descEn: 'Dedicated support line (01719478830) for size changes or hassle-free returns.',
                  descBn: 'সাইজ পরিবর্তন বা রিটার্নের জন্য সরাসরি হেল্পলাইন (01719478830) সহায়তা।',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-6 bg-[#FAF8F5] border border-[#111113]/8 space-y-3">
                  <item.icon className="w-5 h-5 text-[#B89352]" />
                  <h3 className="text-base font-semibold text-[#111113]">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </h3>
                  <p className="text-sm text-[#5C5B57] leading-relaxed">
                    {lang === 'bn' ? item.descBn : item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div>
            <h2 className="font-display text-3xl font-semibold text-[#111113] mb-8">
              {t(UI_TEXT.home.testimonials, lang)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {siteSettings.testimonials.map((item) => (
                <blockquote
                  key={item.id}
                  className="p-6 bg-[#FAF8F5] border border-[#111113]/8 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-[#B89352]">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-[#111113]/85 leading-relaxed">
                      “{lang === 'bn' ? item.quoteBn : item.quoteEn}”
                    </p>
                  </div>
                  <footer className="pt-3 border-t border-[#111113]/8 text-xs text-[#5C5B57]">
                    <span className="font-semibold text-[#111113]">{item.name}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{lang === 'bn' ? item.roleBn : item.roleEn}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{item.location}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Social Showcase & Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">
              {t(UI_TEXT.home.socialTitle, lang)}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
              {t(UI_TEXT.home.newsletterTitle, lang)}
            </h2>
            <p className="text-sm text-[#5C5B57] leading-relaxed max-w-lg">
              {t(UI_TEXT.home.newsletterDesc, lang)}
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার ইমেইল লিখুন' : 'Enter your email address'}
                className="flex-1 px-4 py-3 text-sm bg-white border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
              <button
                type="submit"
                disabled={submittingNews}
                className="px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {t(UI_TEXT.home.subscribe, lang)}
              </button>
            </form>
            <div className="pt-2">
              <a
                href={siteSettings.facebookUrl || 'https://facebook.com/Asvore'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#111113] hover:text-[#B89352]"
              >
                <Facebook className="w-4 h-4 text-[#B89352]" />
                <span>{t(UI_TEXT.home.followFacebook, lang)}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-3 gap-3">
            {[
              '/src/assets/images/cat_watches_1794726921326.jpg',
              '/src/assets/images/prod_panjabi_royal_1794726922972.jpg',
              '/src/assets/images/prod_accessories_cufflinks_1794726923598.jpg',
            ].map((img, i) => (
              <Link key={i} to="/shop" className="aspect-[3/4] bg-[#F2EFE9] overflow-hidden group">
                <ResilientImage
                  src={img}
                  alt={`ASVORE Lookbook ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
