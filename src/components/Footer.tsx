import { Link } from 'react-router-dom';
import { Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t, UI_TEXT } from '../lib/i18n.ts';

export function Footer() {
  const { lang, categories, siteSettings } = useApp();

  return (
    <footer className="bg-[#111113] text-[#FAF8F5] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="font-display text-3xl font-bold tracking-[0.16em] text-[#FAF8F5] block">
              {siteSettings.websiteName || siteSettings.companyName || 'ASVORE'}
            </Link>
            <p className="text-sm text-[#FAF8F5]/70 leading-relaxed max-w-xs">
              {lang === 'bn' ? siteSettings.taglineBn : siteSettings.taglineEn}
            </p>
            <div className="pt-2 space-y-2 text-xs text-[#FAF8F5]/75">
              <a
                href={`tel:${siteSettings.contactNumber}`}
                className="flex items-center gap-2 hover:text-[#C9A461] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#C9A461]" />
                <span className="tabular-nums">{siteSettings.contactNumber}</span>
              </a>
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C9A461] shrink-0 mt-0.5" />
                <span>{lang === 'bn' ? siteSettings.addressBn : siteSettings.addressEn}</span>
              </p>
              <a
                href={`mailto:${siteSettings.email}`}
                className="flex items-center gap-2 hover:text-[#C9A461] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#C9A461]" />
                <span>{siteSettings.email}</span>
              </a>
              <a
                href={siteSettings.facebookUrl || 'https://facebook.com/Asvore'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[#C9A461] transition-colors"
              >
                <Facebook className="w-3.5 h-3.5 text-[#C9A461]" />
                <span>Facebook: Asvore</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A461] mb-4">
              {t(UI_TEXT.footer.quickLinks, lang)}
            </h3>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              {siteSettings.footerMenu && siteSettings.footerMenu.length > 0 ? (
                siteSettings.footerMenu.map((item, idx) => (
                  <li key={`${item.href}-${idx}`}>
                    <Link to={item.href || '/'} className="hover:text-[#FAF8F5] transition-colors">
                      {lang === 'bn' ? item.labelBn || item.labelEn : item.labelEn}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link to="/shop" className="hover:text-[#FAF8F5] transition-colors">
                      {t(UI_TEXT.nav.shop, lang)}
                    </Link>
                  </li>
                  <li>
                    <Link to="/shop?filter=new" className="hover:text-[#FAF8F5] transition-colors">
                      {t(UI_TEXT.nav.newArrivals, lang)}
                    </Link>
                  </li>
                  <li>
                    <Link to="/shop?filter=bestseller" className="hover:text-[#FAF8F5] transition-colors">
                      {t(UI_TEXT.nav.bestSellers, lang)}
                    </Link>
                  </li>
                  <li>
                    <Link to="/track-order" className="hover:text-[#FAF8F5] transition-colors">
                      {t(UI_TEXT.nav.trackOrder, lang)}
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" className="hover:text-[#FAF8F5] transition-colors">
                      {t(UI_TEXT.footer.about, lang)}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A461] mb-4">
              {t(UI_TEXT.footer.categories, lang)}
            </h3>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/shop?category=${cat.slug}`} className="hover:text-[#FAF8F5] transition-colors">
                    {lang === 'bn' ? cat.nameBn : cat.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Support */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A461] mb-4">
              {t(UI_TEXT.footer.policies, lang)}
            </h3>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              <li>
                <Link to="/policies/privacy" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.privacy, lang)}
                </Link>
              </li>
              <li>
                <Link to="/policies/terms" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.terms, lang)}
                </Link>
              </li>
              <li>
                <Link to="/policies/return" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.returns, lang)}
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.shipping, lang)}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.faq, lang)}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#FAF8F5] transition-colors">
                  {t(UI_TEXT.footer.contact, lang)}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF8F5]/55">
          <p>
            © {new Date().getFullYear()} {siteSettings.companyName || 'ASVORE'}. {t(UI_TEXT.footer.rights, lang)}
          </p>
          <div className="flex items-center gap-4">
            <p>
              {lang === 'bn'
                ? 'শাপলামিল, গাইবান্ধা সদর · সারাদেশে হোম ডেলিভারি'
                : 'Shaplamill, Gaibandha Sadar · Nationwide Bangladesh Delivery'}
            </p>
            <span aria-hidden="true">·</span>
            <Link to="/admin" className="hover:text-[#C9A461] transition-colors whitespace-nowrap">
              {lang === 'bn' ? 'অ্যাডমিন পোর্টাল' : 'Admin Portal'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
