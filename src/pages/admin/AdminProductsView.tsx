import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ImagePlus,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { ADMIN_TEXT, formatBdt, t } from '../../lib/i18n.ts';
import type { Product, ProductSpec } from '../../types/index.ts';
import { AdminTableSkeleton, ConfirmDialog } from './ConfirmDialog.tsx';

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsDataURL(file);
  });
}

export function AdminProductsView() {
  const { lang, categories, apiFetch, showToast } = useApp();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/products');
      if (res.ok) {
        const d = (await res.json()) as any;
        setItems(d.products || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
      if (!q) return true;
      return (
        p.nameEn.toLowerCase().includes(q) ||
        p.nameBn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, catFilter]);

  const startNew = () => {
    setIsNew(true);
    setEditing({
      id: `prod-${Date.now()}`,
      slug: '',
      sku: `ASV-${Math.floor(100 + Math.random() * 900)}`,
      nameEn: '',
      nameBn: '',
      descriptionEn: '',
      descriptionBn: '',
      categoryId: categories[0]?.id || 'mens-clothing',
      subcategoryId: '',
      brand: 'ASVORE',
      regularPrice: 2800,
      discountPrice: null,
      images: ['/src/assets/images/cat_mens_clothing_1794726920987.jpg'],
      sizes: ['M', 'L', 'XL'],
      colors: [{ nameEn: 'Obsidian Black', nameBn: 'কালো', hex: '#111113' }],
      specifications: [],
      weight: '350g',
      tags: ['menswear'],
      seoTitle: '',
      seoDescription: '',
      stock: 20,
      lowStockThreshold: 5,
      featured: false,
      bestSeller: false,
      trending: false,
      newArrival: true,
      published: true,
    });
    setSizesText('M, L, XL');
    setTagsText('menswear, luxury');
    setStockReason('');
  };

  const startEdit = (p: Product) => {
    setIsNew(false);
    setEditing(JSON.parse(JSON.stringify(p)) as Product);
    setSizesText((p.sizes || []).join(', '));
    setTagsText((p.tags || []).join(', '));
    setStockReason('');
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editing) return;
    const urls: string[] = [];
    for (const f of files.slice(0, 5)) {
      try {
        urls.push(await compressImageToDataUrl(f));
      } catch {
        // skip invalid image
      }
    }
    setEditing({ ...editing, images: [...(editing.images || []), ...urls].slice(0, 10) });
    e.target.value = '';
  };

  const addImageByUrl = () => {
    if (!editing || !imageUrlInput.trim()) return;
    setEditing({
      ...editing,
      images: [...(editing.images || []), imageUrlInput.trim()].slice(0, 10),
    });
    setImageUrlInput('');
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    if (!editing?.images) return;
    const target = idx + dir;
    if (target < 0 || target >= editing.images.length) return;
    const copy = [...editing.images];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setEditing({ ...editing, images: copy });
  };

  const setAsThumbnail = (idx: number) => {
    if (!editing?.images || idx === 0) return;
    const copy = [...editing.images];
    const [picked] = copy.splice(idx, 1);
    copy.unshift(picked);
    setEditing({ ...editing, images: copy });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.nameEn || !editing.nameBn || !editing.sku) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        sizes: sizesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        stockChangeReason: stockReason.trim(),
      };
      const res = await apiFetch(isNew ? '/api/admin/products' : `/api/admin/products/${editing.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json()) as any;
        showToast(d.error || 'Failed to save product', 'error');
        return;
      }
      showToast(lang === 'bn' ? 'পণ্য সংরক্ষিত হয়েছে' : 'Product saved successfully', 'success');
      setEditing(null);
      await loadProducts();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await apiFetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    if (res.ok) {
      showToast(lang === 'bn' ? 'পণ্য মুছে ফেলা হয়েছে' : 'Product deleted', 'success');
      await loadProducts();
    } else {
      showToast('Failed to delete product', 'error');
    }
  };

  if (loading && items.length === 0) return <AdminTableSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-[#5C5B57] absolute left-3 top-2.5" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'bn' ? 'পণ্য বা SKU খুঁজুন...' : 'Search product or SKU...'}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent focus:outline-none focus:border-[#B89352]"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="all">{lang === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'bn' ? c.nameBn : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'bn' ? 'নতুন পণ্য যোগ করুন' : 'Add Product'}</span>
        </button>
      </div>

      {/* Rich Product Add / Edit Form */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-[#17171A] border border-[#B89352]/40 p-6 space-y-6 shadow-lg"
        >
          <div className="flex justify-between items-center border-b border-[#111113]/10 dark:border-white/10 pb-3">
            <h3 className="font-display text-2xl font-semibold">
              {isNew
                ? lang === 'bn'
                  ? 'নতুন পণ্য তৈরি করুন'
                  : 'Create New Product'
                : lang === 'bn'
                  ? `সম্পাদনা: ${editing.nameBn}`
                  : `Edit Product: ${editing.nameEn}`}
            </h3>
            <button type="button" onClick={() => setEditing(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Name (English) *</label>
              <input
                type="text"
                required
                value={editing.nameEn || ''}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">নাম (বাংলা) *</label>
              <input
                type="text"
                required
                value={editing.nameBn || ''}
                onChange={(e) => setEditing({ ...editing, nameBn: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">SKU *</label>
              <input
                type="text"
                required
                value={editing.sku || ''}
                onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Brand</label>
              <input
                type="text"
                value={editing.brand || 'ASVORE'}
                onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select
                value={editing.categoryId || ''}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Subcategory</label>
              <input
                type="text"
                value={editing.subcategoryId || ''}
                onChange={(e) => setEditing({ ...editing, subcategoryId: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Regular Price (৳)</label>
              <input
                type="number"
                required
                min={0}
                value={editing.regularPrice || 0}
                onChange={(e) => setEditing({ ...editing, regularPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Discount Price (৳)</label>
              <input
                type="number"
                min={0}
                value={editing.discountPrice ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, discountPrice: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Stock Qty</label>
              <input
                type="number"
                required
                min={0}
                value={editing.stock ?? 0}
                onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Low Stock Alert</label>
              <input
                type="number"
                min={0}
                value={editing.lowStockThreshold ?? 5}
                onChange={(e) => setEditing({ ...editing, lowStockThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
              />
            </div>
          </div>

          {!isNew && (
            <div>
              <label className="block text-xs font-semibold mb-1">Stock Adjustment Note (Logged to Stock History)</label>
              <input
                type="text"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g. Restocked 25 units from Gaibandha atelier"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          )}

          {/* Bilingual Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Description (English)</label>
              <textarea
                rows={3}
                value={editing.descriptionEn || ''}
                onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">বিবরণ (বাংলা)</label>
              <textarea
                rows={3}
                value={editing.descriptionBn || ''}
                onChange={(e) => setEditing({ ...editing, descriptionBn: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          </div>

          {/* Multi-Image Manager */}
          <div className="space-y-3 border border-[#111113]/10 dark:border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4 text-[#B89352]" />
                <span>Product Images ({editing.images?.length || 0}/10)</span>
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#111113]/20 dark:border-white/20 hover:border-[#B89352] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageFileUpload} className="hidden" />
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL..."
                    className="px-2.5 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent w-48"
                  />
                  <button
                    type="button"
                    onClick={addImageByUrl}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#111113] dark:bg-[#C9A461] text-white dark:text-[#111113] cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(editing.images || []).map((imgUrl, idx) => (
                <div key={idx} className="border border-[#111113]/15 dark:border-white/15 p-2 space-y-2 bg-[#FAF8F5] dark:bg-white/5">
                  <div className="aspect-square bg-white dark:bg-black/20 overflow-hidden relative">
                    <img src={imgUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#111113] text-[#C9A461] text-[10px] font-bold">
                        MAIN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveImage(idx, -1)} className="p-1 border border-[#111113]/15 cursor-pointer" title="Move left">
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveImage(idx, 1)} className="p-1 border border-[#111113]/15 cursor-pointer" title="Move right">
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    {idx !== 0 && (
                      <button type="button" onClick={() => setAsThumbnail(idx)} className="text-[#B89352] cursor-pointer" title="Set as main thumbnail">
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          images: (editing.images || []).filter((_, i) => i !== idx),
                        })
                      }
                      className="text-red-700 dark:text-red-400 cursor-pointer"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sizes, Weight, Tags, Colors & Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Sizes (comma separated)</label>
              <input
                type="text"
                value={sizesText}
                onChange={(e) => setSizesText(e.target.value)}
                placeholder="M, L, XL, XXL"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Weight / Dimensions</label>
              <input
                type="text"
                value={editing.weight || ''}
                onChange={(e) => setEditing({ ...editing, weight: e.target.value })}
                placeholder="e.g. 350g"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="luxury, leather, eid"
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          </div>

          {/* Color Swatches Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider">Color Variants</label>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    colors: [...(editing.colors || []), { nameEn: 'New Color', nameBn: 'নতুন রঙ', hex: '#111113' }],
                  })
                }
                className="text-xs font-semibold text-[#B89352] cursor-pointer"
              >
                + Add Color
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(editing.colors || []).map((col, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-[#111113]/10 dark:border-white/10 p-2 text-xs">
                  <input
                    type="color"
                    value={col.hex}
                    onChange={(e) => {
                      const next = [...(editing.colors || [])];
                      next[idx] = { ...next[idx], hex: e.target.value };
                      setEditing({ ...editing, colors: next });
                    }}
                    className="w-8 h-8 cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={col.nameEn}
                    onChange={(e) => {
                      const next = [...(editing.colors || [])];
                      next[idx] = { ...next[idx], nameEn: e.target.value };
                      setEditing({ ...editing, colors: next });
                    }}
                    placeholder="Color EN"
                    className="flex-1 px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <input
                    type="text"
                    value={col.nameBn}
                    onChange={(e) => {
                      const next = [...(editing.colors || [])];
                      next[idx] = { ...next[idx], nameBn: e.target.value };
                      setEditing({ ...editing, colors: next });
                    }}
                    placeholder="রঙ BN"
                    className="flex-1 px-2 py-1 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ ...editing, colors: (editing.colors || []).filter((_, i) => i !== idx) })
                    }
                    className="text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider">Specifications</label>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    specifications: [
                      ...(editing.specifications || []),
                      { labelEn: '', labelBn: '', valueEn: '', valueBn: '' },
                    ],
                  })
                }
                className="text-xs font-semibold text-[#B89352] cursor-pointer"
              >
                + Add Spec Row
              </button>
            </div>
            {(editing.specifications || []).map((sp: ProductSpec, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Label (EN)"
                  value={sp.labelEn}
                  onChange={(e) => {
                    const next = [...(editing.specifications || [])];
                    next[idx] = { ...next[idx], labelEn: e.target.value };
                    setEditing({ ...editing, specifications: next });
                  }}
                  className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="text"
                  placeholder="লেবেল (বাংলা)"
                  value={sp.labelBn}
                  onChange={(e) => {
                    const next = [...(editing.specifications || [])];
                    next[idx] = { ...next[idx], labelBn: e.target.value };
                    setEditing({ ...editing, specifications: next });
                  }}
                  className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="text"
                  placeholder="Value (EN)"
                  value={sp.valueEn}
                  onChange={(e) => {
                    const next = [...(editing.specifications || [])];
                    next[idx] = { ...next[idx], valueEn: e.target.value };
                    setEditing({ ...editing, specifications: next });
                  }}
                  className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="text"
                  placeholder="মান (বাংলা)"
                  value={sp.valueBn}
                  onChange={(e) => {
                    const next = [...(editing.specifications || [])];
                    next[idx] = { ...next[idx], valueBn: e.target.value };
                    setEditing({ ...editing, specifications: next });
                  }}
                  className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      specifications: (editing.specifications || []).filter((_, i) => i !== idx),
                    })
                  }
                  className="text-red-700 text-left px-2 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">SEO Meta Title</label>
              <input
                type="text"
                value={editing.seoTitle || ''}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">SEO Meta Description</label>
              <input
                type="text"
                value={editing.seoDescription || ''}
                onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="flex flex-wrap gap-6 text-xs font-medium">
            {(
              [
                ['published', 'Published'],
                ['featured', 'Featured'],
                ['bestSeller', 'Best Seller'],
                ['trending', 'Trending'],
                ['newArrival', 'New Arrival'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((editing as any)[k])}
                  onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {/* Stock History Timeline */}
          {Array.isArray(editing.stockHistory) && editing.stockHistory.length > 0 && (
            <div className="border-t border-[#111113]/10 dark:border-white/10 pt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B89352]" />
                <span>Stock History</span>
              </h4>
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {editing.stockHistory.map((h, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#111113]/6 dark:border-white/6">
                    <span>
                      <strong className={h.delta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700'}>
                        {h.delta >= 0 ? `+${h.delta}` : h.delta}
                      </strong>{' '}
                      ({h.previousStock} → {h.newStock}) · {h.reason} · {h.actorEmail}
                    </span>
                    <span className="font-mono-num text-[11px] text-[#5C5B57]">
                      {new Date(h.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {saving ? '...' : lang === 'bn' ? 'পণ্য সংরক্ষণ করুন' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 border border-[#111113]/20 dark:border-white/20 text-xs font-semibold uppercase cursor-pointer"
            >
              {t(ADMIN_TEXT.common.cancel, lang)}
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF8F5] dark:bg-white/5 border-b border-[#111113]/10 dark:border-white/10 text-xs uppercase text-[#5C5B57] dark:text-[#FAF8F5]/65">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Visibility</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111113]/8 dark:divide-white/8">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#FAF8F5]/60 dark:hover:bg-white/[0.02]">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt={p.nameEn} className="w-10 h-10 object-cover border border-[#111113]/10 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{lang === 'bn' ? p.nameBn : p.nameEn}</p>
                      <p className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60">{p.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono-num text-xs">{p.sku}</td>
                <td className="py-3 px-4 tabular-nums">
                  {p.discountPrice ? (
                    <div>
                      <span className="font-semibold">{formatBdt(p.discountPrice, lang)}</span>
                      <span className="text-xs line-through text-[#5C5B57] ml-1.5">{formatBdt(p.regularPrice, lang)}</span>
                    </div>
                  ) : (
                    <span className="font-semibold">{formatBdt(p.regularPrice, lang)}</span>
                  )}
                </td>
                <td className="py-3 px-4 tabular-nums">
                  <span
                    className={
                      p.stock <= 0
                        ? 'text-red-700 dark:text-red-400 font-bold'
                        : p.stock <= (p.lowStockThreshold || 5)
                          ? 'text-amber-700 dark:text-amber-400 font-semibold'
                          : ''
                    }
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs">{p.published ? 'Published' : 'Draft'}</td>
                <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="text-xs font-semibold text-[#B89352] hover:underline cursor-pointer"
                  >
                    {t(ADMIN_TEXT.common.edit, lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="text-xs text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    {t(ADMIN_TEXT.common.delete, lang)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        lang={lang}
        destructive
        title={lang === 'bn' ? 'পণ্য মুছে ফেলবেন?' : 'Delete Product?'}
        message={`${deleteTarget?.nameEn || ''} (${deleteTarget?.sku || ''})`}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
