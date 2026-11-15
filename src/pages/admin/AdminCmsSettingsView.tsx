import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Bell, CheckCheck, FileText, Globe, Plus, Shield, Tag, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { db } from '../../lib/firebase.ts';
import type {
  AdminAuditLog,
  AdminNotification,
  AdminRole,
  Category,
  Coupon,
  NavLinkItem,
  SiteSettings,
} from '../../types/index.ts';
import { ConfirmDialog } from './ConfirmDialog.tsx';

export function AdminCategoriesCouponsView() {
  const { lang, categories, apiFetch, showToast } = useApp();
  const [catForm, setCatForm] = useState<Partial<Category>>({
    nameEn: '',
    nameBn: '',
    slug: '',
    parentId: '',
    image: '/src/assets/images/cat_mens_clothing_1794726920987.jpg',
    sortOrder: 10,
  });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 10,
    minOrderAmount: 1000,
    maxDiscount: 1000,
    usageLimit: 100,
    expiresAt: '2027-12-31',
    active: true,
  });
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, 'id'>) })));
    });
    return () => unsub();
  }, []);

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(catForm),
    });
    if (res.ok) {
      setCatForm({ nameEn: '', nameBn: '', slug: '', parentId: '', image: '', sortOrder: 10 });
      showToast(lang === 'bn' ? 'ক্যাটাগরি সংরক্ষিত হয়েছে' : 'Category saved', 'success');
    } else {
      showToast('Failed to save category', 'error');
    }
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({
        ...couponForm,
        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : '2027-12-31T23:59:59.000Z',
      }),
    });
    if (res.ok) {
      setCouponForm({ code: '', type: 'percentage', value: 10, minOrderAmount: 1000, active: true });
      showToast(lang === 'bn' ? 'কুপন তৈরি হয়েছে' : 'Coupon saved', 'success');
    } else {
      showToast('Failed to save coupon', 'error');
    }
  };

  const toggleCouponActive = async (c: Coupon) => {
    await apiFetch('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({ ...c, active: !c.active }),
    });
    showToast('Coupon status updated', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-5">
        <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#B89352]" />
          <span>{lang === 'bn' ? 'ক্যাটাগরি ও সাব-ক্যাটাগরি' : 'Category & Subcategory Management'}</span>
        </h2>

        <form onSubmit={saveCategory} className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-sm">
          <input
            type="text"
            required
            placeholder="Name (EN)"
            value={catForm.nameEn || ''}
            onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            required
            placeholder="নাম (বাংলা)"
            value={catForm.nameBn || ''}
            onChange={(e) => setCatForm({ ...catForm, nameBn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            placeholder="Parent Category ID"
            value={catForm.parentId || ''}
            onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            placeholder="Image URL"
            value={catForm.image || ''}
            onChange={(e) => setCatForm({ ...catForm, image: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="number"
            placeholder="Sort Order"
            value={catForm.sortOrder ?? 10}
            onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase cursor-pointer"
          >
            Save Category
          </button>
        </form>

        <div className="divide-y divide-[#111113]/8 dark:divide-white/8 text-sm">
          {categories.map((c) => (
            <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <strong>{c.nameEn}</strong> / {c.nameBn}{' '}
                <span className="text-xs font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/60">
                  ({c.slug}) {c.parentId ? `↳ parent: ${c.parentId}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteCatId(c.id)}
                className="text-red-700 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-5">
        <h2 className="font-display text-2xl font-semibold">
          {lang === 'bn' ? 'কুপন ও ডিসকাউন্ট ম্যানেজমেন্ট' : 'Coupon & Discount Management'}
        </h2>
        <form onSubmit={saveCoupon} className="grid grid-cols-2 sm:grid-cols-7 gap-3 text-sm">
          <input
            type="text"
            required
            placeholder="CODE"
            value={couponForm.code || ''}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent font-mono-num"
          />
          <select
            value={couponForm.type || 'percentage'}
            onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as any })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="percentage">%</option>
            <option value="fixed">৳ Fixed</option>
          </select>
          <input
            type="number"
            required
            placeholder="Value"
            value={couponForm.value || 0}
            onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="number"
            placeholder="Min ৳"
            value={couponForm.minOrderAmount || 0}
            onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="number"
            placeholder="Max ৳"
            value={couponForm.maxDiscount ?? ''}
            onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: Number(e.target.value) })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="date"
            value={String(couponForm.expiresAt || '').slice(0, 10)}
            onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase cursor-pointer"
          >
            Create
          </button>
        </form>

        <div className="divide-y divide-[#111113]/8 dark:divide-white/8 text-sm">
          {coupons.map((c) => (
            <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono-num font-bold mr-3">{c.code}</span>
                <span className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/65">
                  {c.type === 'percentage' ? `${c.value}%` : `৳${c.value}`} · Min ৳{c.minOrderAmount} · Used{' '}
                  {c.usedCount}/{c.usageLimit || '∞'} · Exp {String(c.expiresAt || '').slice(0, 10)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => void toggleCouponActive(c)}
                  className={`font-semibold underline cursor-pointer ${
                    c.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {c.active ? 'Active (Disable)' : 'Paused (Enable)'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCouponId(c.id)}
                  className="text-red-700 dark:text-red-400 underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteCatId)}
        lang={lang}
        destructive
        title="Delete Category?"
        message={`Remove category "${deleteCatId}"?`}
        onConfirm={async () => {
          if (deleteCatId) await apiFetch(`/api/admin/categories/${deleteCatId}`, { method: 'DELETE' });
          setDeleteCatId(null);
          showToast('Category deleted', 'success');
        }}
        onCancel={() => setDeleteCatId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteCouponId)}
        lang={lang}
        destructive
        title="Delete Coupon?"
        message={`Remove coupon "${deleteCouponId}"?`}
        onConfirm={async () => {
          if (deleteCouponId) await apiFetch(`/api/admin/coupons/${deleteCouponId}`, { method: 'DELETE' });
          setDeleteCouponId(null);
          showToast('Coupon deleted', 'success');
        }}
        onCancel={() => setDeleteCouponId(null)}
      />
    </div>
  );
}

export function AdminCmsAndSettingsView() {
  const { lang, siteSettings, adminRole, apiFetch, showToast } = useApp();
  const [cms, setCms] = useState<SiteSettings>(siteSettings);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<AdminRole>('order_manager');
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    setCms(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    if (adminRole !== 'super_admin') return;
    apiFetch('/api/admin/staff')
      .then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((d: any) => setStaffList(d.staff || []))
      .catch(() => {});
  }, [adminRole]);

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify(cms),
    });
    if (res.ok) {
      showToast(lang === 'bn' ? 'ওয়েবসাইট কনটেন্ট ও সেটিংস সংরক্ষিত হয়েছে' : 'Website CMS & Settings saved', 'success');
    } else {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify({ email: staffEmail.trim(), role: staffRole, active: true }),
    });
    const d = (await res.json()) as any;
    if (!res.ok) {
      showToast(d.error || 'Failed to assign staff', 'error');
      return;
    }
    setStaffEmail('');
    showToast('Staff role updated', 'success');
    const r2 = await apiFetch('/api/admin/staff');
    if (r2.ok) setStaffList(((await r2.json()) as any).staff || []);
  };

  const addMenuLink = (field: 'headerMenu' | 'footerMenu') => {
    const existing = cms[field] || [];
    setCms({
      ...cms,
      [field]: [...existing, { labelEn: 'New Link', labelBn: 'নতুন লিংক', href: '/shop' }],
    });
  };

  const updateMenuLink = (field: 'headerMenu' | 'footerMenu', idx: number, patch: Partial<NavLinkItem>) => {
    const next = [...(cms[field] || [])];
    next[idx] = { ...next[idx], ...patch };
    setCms({ ...cms, [field]: next });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSaveCms}
        className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-6"
      >
        <div className="flex items-center gap-2 border-b border-[#111113]/10 dark:border-white/10 pb-3">
          <Globe className="w-4 h-4 text-[#B89352]" />
          <h2 className="font-display text-2xl font-semibold">
            {lang === 'bn' ? 'ওয়েবসাইট কনটেন্ট (CMS) ও সেটিংস' : 'Website Content CMS & General Settings'}
          </h2>
        </div>

        {/* General & Brand Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">Company / Brand Name</label>
            <input
              type="text"
              value={cms.websiteName || cms.companyName}
              onChange={(e) => setCms({ ...cms, companyName: e.target.value, websiteName: e.target.value })}
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Support Phone</label>
            <input
              type="text"
              value={cms.contactNumber}
              onChange={(e) => setCms({ ...cms, contactNumber: e.target.value })}
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Contact Email</label>
            <input
              type="email"
              value={cms.email}
              onChange={(e) => setCms({ ...cms, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Brand Logo URL (Optional)</label>
            <input
              type="text"
              value={cms.logoUrl}
              onChange={(e) => setCms({ ...cms, logoUrl: e.target.value })}
              placeholder="https://... or /src/assets/..."
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Favicon URL (Optional)</label>
            <input
              type="text"
              value={cms.faviconUrl}
              onChange={(e) => setCms({ ...cms, faviconUrl: e.target.value })}
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Tax / VAT Rate (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={cms.taxRatePercent}
              onChange={(e) => setCms({ ...cms, taxRatePercent: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
        </div>

        {/* Hero & Promotional Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-[#111113]/10 dark:border-white/10">
          <input
            type="text"
            value={cms.hero.headlineEn}
            onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, headlineEn: e.target.value } })}
            placeholder="Hero Headline (EN)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.hero.headlineBn}
            onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, headlineBn: e.target.value } })}
            placeholder="হিরো শিরোনাম (বাংলা)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.hero.bannerImage}
            onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, bannerImage: e.target.value } })}
            placeholder="Hero Banner Image URL"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.promoBanner.textEn}
            onChange={(e) => setCms({ ...cms, promoBanner: { ...cms.promoBanner, textEn: e.target.value } })}
            placeholder="Promo Banner Text (EN)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.promoBanner.textBn}
            onChange={(e) => setCms({ ...cms, promoBanner: { ...cms.promoBanner, textBn: e.target.value } })}
            placeholder="প্রোমো ব্যানার টেক্সট (বাংলা)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.promoBanner.bannerImage}
            onChange={(e) => setCms({ ...cms, promoBanner: { ...cms.promoBanner, bannerImage: e.target.value } })}
            placeholder="Promo Banner Image URL"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
        </div>

        {/* About & Legal Policies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-[#111113]/10 dark:border-white/10">
          <textarea
            rows={2}
            value={cms.aboutEn}
            onChange={(e) => setCms({ ...cms, aboutEn: e.target.value })}
            placeholder="About ASVORE (EN)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <textarea
            rows={2}
            value={cms.aboutBn}
            onChange={(e) => setCms({ ...cms, aboutBn: e.target.value })}
            placeholder="আমাদের সম্পর্কে (বাংলা)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <textarea
            rows={2}
            value={cms.policies.returnEn}
            onChange={(e) => setCms({ ...cms, policies: { ...cms.policies, returnEn: e.target.value } })}
            placeholder="Return & Refund Policy (EN)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <textarea
            rows={2}
            value={cms.policies.returnBn}
            onChange={(e) => setCms({ ...cms, policies: { ...cms.policies, returnBn: e.target.value } })}
            placeholder="রিটার্ন ও রিফান্ড নীতি (বাংলা)"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
        </div>

        {/* Custom Header & Footer Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#111113]/10 dark:border-white/10 text-xs">
          {(['headerMenu', 'footerMenu'] as const).map((field) => (
            <div key={field} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider">
                  {field === 'headerMenu' ? 'Custom Header Nav (Optional)' : 'Custom Footer Links (Optional)'}
                </span>
                <button
                  type="button"
                  onClick={() => addMenuLink(field)}
                  className="inline-flex items-center gap-1 text-[#B89352] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Link
                </button>
              </div>
              {(cms[field] || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-1.5">
                  <input
                    type="text"
                    placeholder="Label EN"
                    value={item.labelEn}
                    onChange={(e) => updateMenuLink(field, idx, { labelEn: e.target.value })}
                    className="px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <input
                    type="text"
                    placeholder="লেবেল বাংলা"
                    value={item.labelBn}
                    onChange={(e) => updateMenuLink(field, idx, { labelBn: e.target.value })}
                    className="px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <input
                    type="text"
                    placeholder="/shop"
                    value={item.href}
                    onChange={(e) => updateMenuLink(field, idx, { href: e.target.value })}
                    className="px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCms({ ...cms, [field]: (cms[field] || []).filter((_, i) => i !== idx) })
                    }
                    className="text-red-700 text-left px-2 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* SEO & Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <input
            type="text"
            value={cms.seoTitle}
            onChange={(e) => setCms({ ...cms, seoTitle: e.target.value })}
            placeholder="SEO Meta Title"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            value={cms.seoDescription}
            onChange={(e) => setCms({ ...cms, seoDescription: e.target.value })}
            placeholder="SEO Meta Description"
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-6 text-xs font-medium">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cms.maintenanceMode}
              onChange={(e) => setCms({ ...cms, maintenanceMode: e.target.checked })}
            />
            <span>Website Maintenance Mode</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cms.promoBanner.enabled}
              onChange={(e) => setCms({ ...cms, promoBanner: { ...cms.promoBanner, enabled: e.target.checked } })}
            />
            <span>Show Promo Banner</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cms.emailNotificationsEnabled}
              onChange={(e) => setCms({ ...cms, emailNotificationsEnabled: e.target.checked })}
            />
            <span>Email Notifications</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cms.smsNotificationsEnabled}
              onChange={(e) => setCms({ ...cms, smsNotificationsEnabled: e.target.checked })}
            />
            <span>SMS Notifications</span>
          </label>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Save Website Content & Settings
        </button>
      </form>

      {/* Admin Staff Roles & RBAC (Super Admin) */}
      {adminRole === 'super_admin' && (
        <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <h3 className="font-display text-xl font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#B89352]" />
            <span>Administrator Roles & Permissions (RBAC)</span>
          </h3>
          <form onSubmit={handleAssignStaff} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="Staff User Email"
              className="flex-1 px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as AdminRole)}
              className="px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="order_manager">Order Manager</option>
              <option value="product_manager">Product Manager</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase cursor-pointer"
            >
              Assign Role
            </button>
          </form>
          {staffList.length > 0 && (
            <div className="divide-y divide-[#111113]/8 dark:divide-white/8 text-xs">
              {staffList.map((s) => (
                <div key={s.uid} className="py-2 flex justify-between">
                  <span>{s.email}</span>
                  <span className="font-semibold uppercase text-[#B89352]">{s.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminNotificationsAndLogsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: AdminNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}) {
  const { lang, apiFetch, showToast } = useApp();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [broadcast, setBroadcast] = useState({ titleEn: '', titleBn: '', bodyEn: '', bodyBn: '' });

  const loadLogs = async () => {
    const res = await apiFetch('/api/admin/audit-logs');
    if (res.ok) {
      const d = (await res.json()) as any;
      setLogs(d.logs || []);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ ...broadcast, type: 'promo' }),
    });
    if (res.ok) {
      setBroadcast({ titleEn: '', titleBn: '', bodyEn: '', bodyBn: '' });
      showToast(lang === 'bn' ? 'প্রচারমূলক বিজ্ঞপ্তি পাঠানো হয়েছে' : 'Broadcast sent to customers', 'success');
      await loadLogs();
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      l.actionType.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.adminEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Admin Notification Feed */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#B89352]" />
            <span>{lang === 'bn' ? 'অ্যাডমিন অ্যালার্ট সেন্টার' : 'Admin Notification Center'}</span>
          </h2>
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#111113]/20 dark:border-white/20 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সব পঠিত চিহ্নিত করুন' : 'Mark All Read'}</span>
          </button>
        </div>

        <div className="divide-y divide-[#111113]/8 dark:divide-white/8 max-h-80 overflow-y-auto text-xs">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && void onMarkRead(n.id)}
              className={`py-3 flex justify-between gap-4 cursor-pointer ${
                !n.read ? 'bg-[#B89352]/8 px-3 -mx-3 font-medium' : 'opacity-75'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">{lang === 'bn' ? n.titleBn : n.titleEn}</p>
                <p className="text-[#5C5B57] dark:text-[#FAF8F5]/70">{lang === 'bn' ? n.bodyBn : n.bodyEn}</p>
              </div>
              <span className="font-mono-num text-[11px] shrink-0 text-[#5C5B57]">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="py-6 text-center text-[#5C5B57]">No admin notifications yet.</p>
          )}
        </div>
      </div>

      {/* Customer Notification Broadcast */}
      <form
        onSubmit={handleBroadcast}
        className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4"
      >
        <h3 className="font-display text-xl font-semibold">
          {lang === 'bn' ? 'গ্রাহক বিজ্ঞপ্তি ব্রডকাস্ট' : 'Customer Broadcast Notification'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <input
            type="text"
            required
            placeholder="Title (EN)"
            value={broadcast.titleEn}
            onChange={(e) => setBroadcast({ ...broadcast, titleEn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            required
            placeholder="শিরোনাম (বাংলা)"
            value={broadcast.titleBn}
            onChange={(e) => setBroadcast({ ...broadcast, titleBn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            required
            placeholder="Message (EN)"
            value={broadcast.bodyEn}
            onChange={(e) => setBroadcast({ ...broadcast, bodyEn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
          <input
            type="text"
            required
            placeholder="বার্তা (বাংলা)"
            value={broadcast.bodyBn}
            onChange={(e) => setBroadcast({ ...broadcast, bodyBn: e.target.value })}
            className="px-3 py-2 border border-[#111113]/15 dark:border-white/15 bg-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase cursor-pointer"
        >
          Send to All Customers
        </button>
      </form>

      {/* Immutable Admin Activity & Audit Logs */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B89352]" />
            <span>Admin Activity & Security Audit Logs</span>
          </h3>
          <input
            type="search"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Filter logs by action or admin email..."
            className="px-3 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent w-64"
          />
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF8F5] dark:bg-white/5 border-b border-[#111113]/10 dark:border-white/10 uppercase text-[#5C5B57] dark:text-[#FAF8F5]/65">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Admin</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111113]/8 dark:divide-white/8">
              {filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">{l.adminEmail}</td>
                  <td className="py-2.5 px-3 font-mono-num font-bold text-[#B89352]">{l.actionType}</td>
                  <td className="py-2.5 px-3">{l.description}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#5C5B57]">
                    No audit log entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
