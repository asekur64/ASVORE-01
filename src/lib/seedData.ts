import type { Category, Coupon, Product, PublicGatewayFlags, ShippingSettings, SiteSettings } from '../types/index.ts';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'mens-clothing',
    slug: 'mens-clothing',
    nameEn: "Men's Clothing",
    nameBn: 'পুরুষদের পোশাক',
    image: '/src/assets/images/cat_mens_clothing_1794726920987.jpg',
    sortOrder: 1,
  },
  {
    id: 'watches',
    slug: 'watches',
    nameEn: 'Watches',
    nameBn: 'হাতঘড়ি',
    image: '/src/assets/images/cat_watches_1794726921326.jpg',
    sortOrder: 2,
  },
  {
    id: 'belts',
    slug: 'belts',
    nameEn: 'Belts',
    nameBn: 'লেদার বেল্ট',
    image: '/src/assets/images/cat_belts_wallets_1794726921991.jpg',
    sortOrder: 3,
  },
  {
    id: 'wallets',
    slug: 'wallets',
    nameEn: 'Wallets',
    nameBn: 'ওয়ালেট',
    image: '/src/assets/images/cat_belts_wallets_1794726921991.jpg',
    sortOrder: 4,
  },
  {
    id: 'sunglasses',
    slug: 'sunglasses',
    nameEn: 'Sunglasses',
    nameBn: 'সানগ্লাস',
    image: '/src/assets/images/cat_sunglasses_1794726922051.jpg',
    sortOrder: 5,
  },
  {
    id: 'accessories',
    slug: 'accessories',
    nameEn: "Men's Accessories",
    nameBn: 'পুরুষদের এক্সেসরিজ',
    image: '/src/assets/images/prod_accessories_cufflinks_1794726923598.jpg',
    sortOrder: 6,
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'asv-chronograph-obsidian',
    slug: 'asvore-obsidian-gold-dress-watch',
    sku: 'ASV-WCH-001',
    nameEn: 'Obsidian Gold Dress Watch',
    nameBn: 'অবসিডিয়ান গোল্ড ড্রেস ওয়াচ',
    descriptionEn:
      'Precision Japanese quartz movement housed in a 40mm brushed champagne-gold stainless steel case. Paired with a sapphire-coated mineral crystal and hand-stitched full-grain black calfskin strap.',
    descriptionBn:
      '৪০ মিমি ব্রাশড শ্যাম্পেইন-গোল্ড স্টেইনলেস স্টিল কেসে নির্মিত নিখুঁত জাপানিজ কোয়ার্টজ মুভমেন্ট ঘড়ি। স্যাফায়ার-কোটেড গ্লাস এবং হাতে সেলাই করা খাঁটি কালো কাফস্কিন লেদার স্ট্র্যাপ যুক্ত।',
    categoryId: 'watches',
    brand: 'ASVORE Horology',
    regularPrice: 8500,
    discountPrice: 6950,
    images: [
      '/src/assets/images/cat_watches_1794726921326.jpg',
      '/src/assets/images/editorial_craftsmanship_1794726923893.jpg',
    ],
    sizes: ['40mm'],
    colors: [
      { nameEn: 'Obsidian / Gold', nameBn: 'কালো ও সোনালি', hex: '#B89352' },
      { nameEn: 'Charcoal / Silver', nameBn: 'চারকোল ও সিলভার', hex: '#52525B' },
    ],
    specifications: [
      { labelEn: 'Case Diameter', labelBn: 'কেস ডায়ামিটার', valueEn: '40 mm (316L Steel)', valueBn: '৪০ মিমি (৩১৬এল স্টিল)' },
      { labelEn: 'Water Resistance', labelBn: 'ওয়াটার রেজিস্ট্যান্স', valueEn: '5 ATM (50 Meters)', valueBn: '৫ এটিএম (৫০ মিটার)' },
      { labelEn: 'Strap', labelBn: 'স্ট্র্যাপ', valueEn: 'Italian Calfskin Leather', valueBn: 'ইতালীয় কাফস্কিন লেদার' },
      { labelEn: 'Warranty', labelBn: 'ওয়ারেন্টি', valueEn: '2 Years Official Service', valueBn: '২ বছরের অফিসিয়াল সার্ভিস' },
    ],
    stock: 24,
    lowStockThreshold: 5,
    featured: true,
    bestSeller: true,
    trending: true,
    newArrival: true,
    published: true,
    ratingAvg: 4.9,
    ratingCount: 38,
    soldCount: 142,
  },
  {
    id: 'asv-merino-linen-blazer-set',
    slug: 'charcoal-merino-polo-tailored-linen-blazer',
    sku: 'ASV-CLO-002',
    nameEn: 'Tailored Charcoal Linen Blazer',
    nameBn: 'টেইলর্ড চারকোল লিনেন ব্লেজার',
    descriptionEn:
      'Breathable structured linen-wool blend blazer tailored for the Bangladesh climate. Half-canvas chest construction, horn buttons, and sleek minimal lapel geometry.',
    descriptionBn:
      'বাংলাদেশের আবহাওয়ার উপযোগী আরামদায়ক লিনেন-উল ব্লেন্ড টেইলর্ড ব্লেজার। হাফ-ক্যানভাস ফিট, প্রিমিয়াম বাটন এবং মার্জিত মডার্ন ল্যাপেল ডিজাইন।',
    categoryId: 'mens-clothing',
    brand: 'ASVORE Atelier',
    regularPrice: 9800,
    discountPrice: 7900,
    images: [
      '/src/assets/images/cat_mens_clothing_1794726920987.jpg',
      '/src/assets/images/hero_asvore_menswear_1794726920909.jpg',
    ],
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { nameEn: 'Deep Charcoal', nameBn: 'ডিপ চারকোল', hex: '#27272A' },
      { nameEn: 'Obsidian Black', nameBn: 'অবসিডিয়ান ব্ল্যাক', hex: '#111113' },
    ],
    specifications: [
      { labelEn: 'Fabric', labelBn: 'ফ্যাব্রিক', valueEn: '70% Linen, 30% Fine Merino Wool', valueBn: '৭০% লিনেন, ৩০% মেরিনো উল' },
      { labelEn: 'Fit', labelBn: 'ফিট', valueEn: 'Tailored Modern Slim', valueBn: 'টেইলর্ড মডার্ন স্লিম' },
      { labelEn: 'Lining', labelBn: 'লাইনিং', valueEn: 'Breathable Bemberg Cupro', valueBn: 'ব্রিদেবল কিউপ্রো লাইনিং' },
    ],
    stock: 18,
    lowStockThreshold: 4,
    featured: true,
    bestSeller: true,
    trending: false,
    newArrival: true,
    published: true,
    ratingAvg: 4.8,
    ratingCount: 29,
    soldCount: 94,
  },
  {
    id: 'asv-midnight-royal-panjabi',
    slug: 'midnight-royal-embroidered-panjabi',
    sku: 'ASV-CLO-003',
    nameEn: 'Midnight Royal Silk-Cotton Panjabi',
    nameBn: 'মিডনাইট রয়্যাল সিল্ক-কটন পাঞ্জাবি',
    descriptionEn:
      'Signature Bangladeshi heritage silhouette reimagined in midnight-black Egyptian cotton-silk with subtle geometric tonal embroidery and brushed gold metallic buttons.',
    descriptionBn:
      'ইজিপশিয়ান কটন-সিল্ক কাপড়ে তৈরি ঐতিহ্যবাহী অথচ আধুনিক মিডনাইট ব্ল্যাক পাঞ্জাবি। সূক্ষ্ম টোনাল এমব্রয়ডারি এবং ব্রাশড গোল্ড বাটনের আভিজাত্য।',
    categoryId: 'mens-clothing',
    brand: 'ASVORE Heritage',
    regularPrice: 4800,
    discountPrice: 3950,
    images: [
      '/src/assets/images/prod_panjabi_royal_1794726922972.jpg',
      '/src/assets/images/hero_asvore_menswear_1794726920909.jpg',
    ],
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { nameEn: 'Midnight Black', nameBn: 'মিডনাইট ব্ল্যাক', hex: '#141416' },
    ],
    specifications: [
      { labelEn: 'Material', labelBn: 'উপাদান', valueEn: 'Egyptian Mercerized Cotton-Silk', valueBn: 'ইজিপশিয়ান মার্সারাইজড কটন-সিল্ক' },
      { labelEn: 'Collar', labelBn: 'কলার', valueEn: 'Structured Band Collar', valueBn: 'স্ট্রাকচার্ড ব্যান্ড কলার' },
      { labelEn: 'Hardware', labelBn: 'বাটন', valueEn: 'Brushed Brass Gold Buttons', valueBn: 'ব্রাশড গোল্ড মেটাল বাটন' },
    ],
    stock: 42,
    lowStockThreshold: 8,
    featured: true,
    bestSeller: true,
    trending: true,
    newArrival: true,
    published: true,
    ratingAvg: 4.9,
    ratingCount: 64,
    soldCount: 215,
  },
  {
    id: 'asv-fullgrain-dress-belt',
    slug: 'sovereign-full-grain-gold-buckle-belt',
    sku: 'ASV-BLT-004',
    nameEn: 'Sovereign Full-Grain Leather Belt',
    nameBn: 'সভরেইন ফুল-গ্রেইন লেদার বেল্ট',
    descriptionEn:
      'Vegetable-tanned full-grain black cowhide belt finished with a solid brushed champagne-gold brass buckle and hand-burnished edges.',
    descriptionBn:
      'খাঁটি ফুল-গ্রেইন কালো চামড়ায় তৈরি প্রিমিয়াম ড্রেস বেল্ট, সাথে সলিড ব্রাশড গোল্ড ব্রাস বাকল এবং নিখুঁত হ্যান্ড-বার্নিশড ফিনিশ।',
    categoryId: 'belts',
    brand: 'ASVORE Leathercraft',
    regularPrice: 2600,
    discountPrice: 2150,
    images: [
      '/src/assets/images/cat_belts_wallets_1794726921991.jpg',
      '/src/assets/images/editorial_craftsmanship_1794726923893.jpg',
    ],
    sizes: ['32', '34', '36', '38', '40'],
    colors: [
      { nameEn: 'Black / Brushed Gold', nameBn: 'কালো / ব্রাশড গোল্ড', hex: '#18181B' },
    ],
    specifications: [
      { labelEn: 'Leather', labelBn: 'লেদার', valueEn: '100% Full-Grain Cowhide', valueBn: '১০০% ফুল-গ্রেইন কাউহাইড' },
      { labelEn: 'Width', labelBn: 'প্রস্থ', valueEn: '35 mm Dress & Chino Fit', valueBn: '৩৫ মিমি ফরমাল ও ক্যাজুয়াল ফিট' },
      { labelEn: 'Buckle', labelBn: 'বাকল', valueEn: 'Solid Brushed Brass Alloy', valueBn: 'সলিড ব্রাশড ব্রাস' },
    ],
    stock: 35,
    lowStockThreshold: 6,
    featured: false,
    bestSeller: true,
    trending: true,
    newArrival: false,
    published: true,
    ratingAvg: 4.8,
    ratingCount: 41,
    soldCount: 176,
  },
  {
    id: 'asv-pebble-bifold-wallet',
    slug: 'atelier-pebble-leather-bifold-wallet',
    sku: 'ASV-WLT-005',
    nameEn: 'Atelier Pebble Leather Bifold Wallet',
    nameBn: 'আতেলিয়ের পেবল লেদার বাইফোল্ড ওয়ালেট',
    descriptionEn:
      'Slim-profile 8-slot RFID-shielded bifold wallet crafted from supple pebble-grain black leather with reinforced waxed-linen stitching.',
    descriptionBn:
      'আরএফআইডি প্রোটেক্টেড ৮টি কার্ড স্লটযুক্ত স্লিম বাইফোল্ড ওয়ালেট। নরম পেবল-গ্রেইন কালো চামড়া ও মজবুত ওয়াক্সড সুতার সেলাই।',
    categoryId: 'wallets',
    brand: 'ASVORE Leathercraft',
    regularPrice: 2200,
    discountPrice: 1790,
    images: [
      '/src/assets/images/cat_belts_wallets_1794726921991.jpg',
    ],
    sizes: ['Standard'],
    colors: [
      { nameEn: 'Obsidian Pebble', nameBn: 'অবসিডিয়ান পেবল', hex: '#111113' },
    ],
    specifications: [
      { labelEn: 'Capacity', labelBn: 'ধারণক্ষমতা', valueEn: '8 Cards + Dual Note Compartments', valueBn: '৮টি কার্ড + ২টি নোট কম্পার্টমেন্ট' },
      { labelEn: 'Protection', labelBn: 'সুরক্ষা', valueEn: 'Integrated RFID Blocking Layer', valueBn: 'আরএফআইডি ব্লকিং লেয়ার' },
    ],
    stock: 50,
    lowStockThreshold: 10,
    featured: true,
    bestSeller: true,
    trending: false,
    newArrival: true,
    published: true,
    ratingAvg: 4.9,
    ratingCount: 53,
    soldCount: 230,
  },
  {
    id: 'asv-tortoise-gold-sunglasses',
    slug: 'solaris-acetate-gold-polarized-sunglasses',
    sku: 'ASV-SUN-006',
    nameEn: 'Solaris Acetate & Gold Sunglasses',
    nameBn: 'সোলারিস এসিটেট ও গোল্ড সানগ্লাস',
    descriptionEn:
      'Hand-finished dark tortoiseshell Italian acetate frame accented with brushed titanium-gold temples and UV400 polarized mineral-tint lenses.',
    descriptionBn:
      'ইতালীয় ডার্ক টরটয়েজ এসিটেট ফ্রেম, ব্রাশড গোল্ড টেম্পল এবং ইউভি৪০০ পোলারাইজড লেন্সযুক্ত আভিজাত্যপূর্ণ পুরুষদের সানগ্লাস।',
    categoryId: 'sunglasses',
    brand: 'ASVORE Eyewear',
    regularPrice: 3600,
    discountPrice: 2950,
    images: [
      '/src/assets/images/cat_sunglasses_1794726922051.jpg',
    ],
    sizes: ['52-20-145'],
    colors: [
      { nameEn: 'Dark Tortoise / Gold', nameBn: 'ডার্ক টরটয়েজ / গোল্ড', hex: '#5C4033' },
    ],
    specifications: [
      { labelEn: 'Lens', labelBn: 'লেন্স', valueEn: 'UV400 Polarized Anti-Glare', valueBn: 'ইউভি৪০০ পোলারাইজড অ্যান্টি-গ্লেয়ার' },
      { labelEn: 'Frame', labelBn: 'ফ্রেম', valueEn: 'Cellulose Acetate & Brushed Alloy', valueBn: 'সেলুলোজ এসিটেট ও ব্রাশড অ্যালয়' },
    ],
    stock: 22,
    lowStockThreshold: 5,
    featured: true,
    bestSeller: false,
    trending: true,
    newArrival: true,
    published: true,
    ratingAvg: 4.7,
    ratingCount: 19,
    soldCount: 68,
  },
  {
    id: 'asv-executive-cufflink-set',
    slug: 'geometric-gold-cufflinks-saffiano-cardholder-set',
    sku: 'ASV-ACC-007',
    nameEn: 'Executive Cufflinks & Cardholder Set',
    nameBn: 'এক্সিকিউটিভ কাফলিংকস ও কার্ডহোল্ডার সেট',
    descriptionEn:
      'Curated formal gift set combining faceted brushed-gold cufflinks, a sleek matching tie bar, and a black Saffiano leather zip cardholder.',
    descriptionBn:
      'ব্রাশড গোল্ড জ্যামিতিক কাফলিংকস, ম্যাচিং টাই বার এবং কালো সাফিয়ানো লেদার কার্ডহোল্ডার সমৃদ্ধ প্রিমিয়াম গিফট সেট।',
    categoryId: 'accessories',
    brand: 'ASVORE Atelier',
    regularPrice: 3900,
    discountPrice: 3250,
    images: [
      '/src/assets/images/prod_accessories_cufflinks_1794726923598.jpg',
    ],
    sizes: ['Gift Box'],
    colors: [
      { nameEn: 'Brushed Gold / Black', nameBn: 'ব্রাশড গোল্ড / কালো', hex: '#B89352' },
    ],
    specifications: [
      { labelEn: 'Includes', labelBn: 'সেটে যা থাকছে', valueEn: 'Cufflinks, Tie Clip, Saffiano Cardholder', valueBn: 'কাফলিংকস, টাই ক্লিপ, সাফিয়ানো কার্ডহোল্ডার' },
      { labelEn: 'Presentation', labelBn: 'প্যাকেজিং', valueEn: 'ASVORE Velvet Presentation Box', valueBn: 'আসভোর ভেলভেট প্রেজেন্টেশন বক্স' },
    ],
    stock: 16,
    lowStockThreshold: 4,
    featured: true,
    bestSeller: true,
    trending: true,
    newArrival: false,
    published: true,
    ratingAvg: 4.9,
    ratingCount: 31,
    soldCount: 112,
  },
  {
    id: 'asv-merino-knit-polo',
    slug: 'fine-merino-knit-short-sleeve-polo',
    sku: 'ASV-CLO-008',
    nameEn: 'Fine Merino Knit Polo',
    nameBn: 'ফাইন মেরিনো নিট পোলো শার্ট',
    descriptionEn:
      'Ultra-soft 16-gauge combed merino knit polo with mother-of-pearl buttons and ribbed cuffs for effortless smart-casual versatility.',
    descriptionBn:
      'মাদার-অব-পার্ল বাটন এবং নিখুঁত রিবড কলারসহ আরামদায়ক ফাইন মেরিনো নিট পোলো শার্ট—স্মার্ট-ক্যাজুয়াল ও অফিস আউটফিটের জন্য উপযুক্ত।',
    categoryId: 'mens-clothing',
    brand: 'ASVORE Studio',
    regularPrice: 3200,
    discountPrice: 2650,
    images: [
      '/src/assets/images/cat_mens_clothing_1794726920987.jpg',
    ],
    sizes: ['M', 'L', 'XL'],
    colors: [
      { nameEn: 'Obsidian', nameBn: 'অবসিডিয়ান ব্ল্যাক', hex: '#18181B' },
    ],
    specifications: [
      { labelEn: 'Yarn', labelBn: 'সুতা', valueEn: '16-Gauge Extra-Fine Merino & Cotton', valueBn: '১৬-গেজ এক্সট্রা-ফাইন মেরিনো ও কটন' },
      { labelEn: 'Care', labelBn: 'যত্ন', valueEn: 'Cold Gentle Wash / Flat Dry', valueBn: 'হালকা ঠান্ডা ধোয়া' },
    ],
    stock: 30,
    lowStockThreshold: 6,
    featured: false,
    bestSeller: false,
    trending: true,
    newArrival: true,
    published: true,
    ratingAvg: 4.8,
    ratingCount: 22,
    soldCount: 79,
  },
];

export const SEED_SHIPPING: ShippingSettings = {
  insideGaibandhaCharge: 60,
  outsideGaibandhaCharge: 130,
  freeShippingThreshold: 10000,
  estimatedDaysInside: '1–2 Days',
  estimatedDaysOutside: '2–4 Days',
  districtOverrides: {},
};

export const SEED_GATEWAY_FLAGS: PublicGatewayFlags = {
  defaultMethod: 'cod',
  codEnabled: true,
  bkashEnabled: true,
  nagadEnabled: true,
  rocketEnabled: true,
  upayEnabled: true,
  sslcommerzEnabled: true,
  cardEnabled: true,
};

export const SEED_COUPONS: Coupon[] = [
  {
    id: 'coupon-asvore10',
    code: 'ASVORE10',
    type: 'percentage',
    value: 10,
    minOrderAmount: 2000,
    maxDiscount: 1500,
    usageLimit: 500,
    usedCount: 14,
    expiresAt: '2027-12-31T23:59:59.000Z',
    active: true,
  },
  {
    id: 'coupon-welcome250',
    code: 'WELCOME250',
    type: 'fixed',
    value: 250,
    minOrderAmount: 1500,
    maxDiscount: 250,
    usageLimit: 1000,
    usedCount: 28,
    expiresAt: '2027-12-31T23:59:59.000Z',
    active: true,
  },
];

export const SEED_SITE_SETTINGS: SiteSettings = {
  companyName: 'ASVORE',
  taglineEn: 'Elevate Your Style. Define Your Identity.',
  taglineBn: 'আপনার স্টাইল, আপনার ব্যক্তিত্বের পরিচয়।',
  contactNumber: '01719478830',
  email: 'support@asvore.com',
  addressEn: 'Shaplamill, Gaibandha Sadar, Gaibandha, Bangladesh',
  addressBn: 'শাপলামিল, গাইবান্ধা সদর, গাইবান্ধা, বাংলাদেশ',
  facebookUrl: 'https://facebook.com/Asvore',
  instagramUrl: 'https://instagram.com/asvore.bd',
  logoUrl: '',
  faviconUrl: '',
  currencySymbol: '৳',
  defaultLanguage: 'bn',
  maintenanceMode: false,
  taxRatePercent: 0,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  seoTitle: "ASVORE – Premium Men's Fashion & Accessories Bangladesh",
  seoDescription:
    "Luxury men's clothing, watches, leather belts, wallets, and sunglasses in Bangladesh. Delivered nationwide from Gaibandha.",
  hero: {
    badgeEn: 'Winter Atelier Collection',
    badgeBn: 'উইন্টার আতেলিয়ের কালেকশন',
    headlineEn: 'Elevate Your Style. Define Your Identity.',
    headlineBn: 'আপনার স্টাইল, আপনার ব্যক্তিত্বের পরিচয়।',
    subheadlineEn:
      'Refined menswear, precision timepieces, and full-grain leather essentials crafted for discerning gentlemen across Bangladesh.',
    subheadlineBn:
      'আধুনিক পুরুষদের জন্য রুচিশীল পোশাক, আভিজাত্যপূর্ণ ঘড়ি এবং খাঁটি লেদার এক্সেসরিজ—সারাদেশে দ্রুত হোম ডেলিভারি।',
    primaryCtaEn: 'Shop Now',
    primaryCtaBn: 'এখনই কিনুন',
    secondaryCtaEn: 'Explore Collection',
    secondaryCtaBn: 'কালেকশন দেখুন',
    bannerImage: '/src/assets/images/hero_asvore_menswear_1794726920909.jpg',
  },
  promoBanner: {
    enabled: true,
    textEn: 'Complimentary Velvet Gift Packaging on Orders Over ৳5,000 — Code: ASVORE10',
    textBn: '৫,০০০৳+ অর্ডারে ফ্রি ভেলভেট গিফট বক্স ও ১০% ছাড় — কোড: ASVORE10',
    subtextEn: 'Nationwide courier dispatch within 24 hours from our Gaibandha studio.',
    subtextBn: 'গাইবান্ধা স্টুডিও থেকে ২৪ ঘণ্টার মধ্যে সারাদেশে কুরিয়ার ডিসপ্যাচ।',
    ctaLabelEn: 'Shop Curated Sets',
    ctaLabelBn: 'গিফট সেট দেখুন',
    ctaLink: '/shop?category=accessories',
    bannerImage: '/src/assets/images/editorial_craftsmanship_1794726923893.jpg',
  },
  aboutEn:
    'Founded at Shaplamill, Gaibandha Sadar, ASVORE brings international quiet-luxury menswear and artisanal accessories to modern Bangladeshi gentlemen. Every piece—from breathable linen tailoring to full-grain calfskin leather—is inspected by hand before dispatch.',
  aboutBn:
    'গাইবান্ধা সদরের শাপলামিল থেকে যাত্রা শুরু করা আসভোর (ASVORE) বাংলাদেশের আধুনিক পুরুষদের জন্য নিয়ে এসেছে আন্তর্জাতিক মানের মেন্সওয়্যার, ঘড়ি এবং খাঁটি লেদার এক্সেসরিজ। প্রতিটি পণ্য ডিসপ্যাচের আগে নিখুঁত মান যাচাই করা হয়।',
  testimonials: [
    {
      id: 't1',
      name: 'Tanvir Ahmed',
      roleEn: 'Senior Architect',
      roleBn: 'সিনিয়র আর্কিটেক্ট',
      location: 'Dhaka',
      quoteEn:
        'Switched from imported mall brands to the ASVORE Charcoal Linen Blazer and Obsidian Watch—breathable tailoring in Dhaka heat with zero compromise on finish.',
      quoteBn:
        'আসভোরের চারকোল লিনেন ব্লেজার ও অবসিডিয়ান ঘড়ি ব্যবহারের পর ফিনিশিং ও আরামে সম্পূর্ণ সন্তুষ্ট। ঢাকার গরমেও অত্যন্ত আরামদায়ক।',
      rating: 5,
    },
    {
      id: 't2',
      name: 'Mahmudul Hasan',
      roleEn: 'Corporate Counsel',
      roleBn: 'কর্পোরেট কাউন্সেল',
      location: 'Gaibandha',
      quoteEn:
        'Same-day Gaibandha delivery within hours of ordering. The full-grain belt and pebble wallet arrive in packaging worthy of a European atelier.',
      quoteBn:
        'গাইবান্ধায় অর্ডারের দিনেই ডেলিভারি পেয়েছি। ফুল-গ্রেইন বেল্ট ও ওয়ালেটের প্যাকেজিং ও চামড়ার মান অসাধারণ।',
      rating: 5,
    },
    {
      id: 't3',
      name: 'Rafiqul Islam',
      roleEn: 'Entrepreneur',
      roleBn: 'উদ্যোক্তা',
      location: 'Chattogram',
      quoteEn:
        'Ordered the Midnight Royal Panjabi for Eid and a corporate wedding. The Egyptian cotton-silk drape and gold hardware look unmistakably refined.',
      quoteBn:
        'ঈদ ও বিয়ের অনুষ্ঠানের জন্য মিডনাইট রয়্যাল পাঞ্জাবি নিয়েছিলাম। কটন-সিল্ক কাপড় ও গোল্ড বাটনের কাজ এককথায় অনন্য।',
      rating: 5,
    },
  ],
  faqs: [
    {
      id: 'faq1',
      questionEn: 'How much are delivery charges inside and outside Gaibandha?',
      questionBn: 'গাইবান্ধার ভেতরে এবং বাইরে ডেলিভারি চার্জ কত?',
      answerEn:
        'Delivery inside Gaibandha is ৳60 (1–2 days) and outside Gaibandha across all 64 districts is ৳130 (2–4 days).',
      answerBn:
        'গাইবান্ধার ভেতরে ডেলিভারি চার্জ ৬০ টাকা (১–২ দিন) এবং গাইবান্ধার বাইরে সারাদেশে ১৩০ টাকা (২–৪ দিন)।',
    },
    {
      id: 'faq2',
      questionEn: 'Which payment methods are accepted?',
      questionBn: 'কোন কোন পেমেন্ট পদ্ধতিতে পেমেন্ট করা যাবে?',
      answerEn:
        'We support Cash on Delivery (COD), bKash, Nagad, Rocket, Upay, SSLCommerz, and Visa/Mastercard Debit & Credit Cards.',
      answerBn:
        'ক্যাশ অন ডেলিভারি (COD), বিকাশ, নগদ, রকেট, উপায়, এসএসএলকমার্জ এবং ভিসা/মাস্টারকার্ড ডেবিট বা ক্রেডিট কার্ড গ্রহণ করা হয়।',
    },
    {
      id: 'faq3',
      questionEn: 'What is your return and exchange policy?',
      questionBn: 'রিটার্ন ও এক্সচেঞ্জ নীতিমালা কী?',
      answerEn:
        'Unused items with original tags and packaging can be exchanged or returned within 7 days of delivery. Contact 01719478830 for instant assistance.',
      answerBn:
        'অব্যবহৃত পণ্য আসল ট্যাগ ও বক্সসহ ডেলিভারির ৭ দিনের মধ্যে এক্সচেঞ্জ বা রিটার্ন করা যাবে। সহায়তার জন্য 01719478830 নম্বরে যোগাযোগ করুন।',
    },
  ],
  policies: {
    privacyEn:
      'ASVORE collects only necessary order, contact, and delivery details to process your purchases and provide tracking updates. Payment credentials are processed strictly through certified payment gateways and never stored on our servers.',
    privacyBn:
      'আসভোর শুধুমাত্র আপনার অর্ডার সম্পন্ন ও ডেলিভারি ট্র্যাকিং প্রদানের জন্য প্রয়োজনীয় তথ্য সংগ্রহ করে। আপনার পেমেন্ট তথ্য সম্পূর্ণ নিরাপদ এবং সার্টিফাইড পেমেন্ট গেটওয়ের মাধ্যমে প্রক্রিয়াকৃত হয়।',
    termsEn:
      'All prices are listed in Bangladeshi Taka (BDT). Orders are subject to stock confirmation. ASVORE reserves the right to cancel suspected fraudulent orders and issue full refunds where applicable.',
    termsBn:
      'সকল পণ্যের মূল্য বাংলাদেশি টাকায় (BDT) নির্ধারিত। স্টক থাকা সাপেক্ষে অর্ডার কনফার্ম করা হয়। প্রয়োজনে যেকোনো সন্দেহজনক অর্ডার বাতিল ও রিফান্ড করার অধিকার আসভোর সংরক্ষণ করে।',
    returnEn:
      'Items may be returned or exchanged within 7 calendar days if unworn, unwashed, and complete with original ASVORE packaging. Defective items qualify for free replacement shipping.',
    returnBn:
      'পণ্য অব্যবহৃত ও অক্ষত অবস্থায় আসল প্যাকেজিংসহ ডেলিভারির ৭ দিনের মধ্যে রিটার্ন বা এক্সচেঞ্জ করা যাবে। ত্রুটিপূর্ণ পণ্যের ক্ষেত্রে ফ্রি রিপ্লেসমেন্ট সুবিধা প্রযোজ্য।',
    shippingEn:
      'Orders placed before 4:00 PM BST are dispatched the same business day from Shaplamill, Gaibandha Sadar. Inside Gaibandha: ৳60 (1–2 days). Nationwide Bangladesh: ৳130 (2–4 days).',
    shippingBn:
      'বিকেল ৪টার আগে প্রাপ্ত অর্ডার গাইবান্ধা সদরের শাপলামিল স্টুডিও থেকে একই দিনে ডিসপ্যাচ করা হয়। গাইবান্ধার ভেতরে ৬০৳ (১–২ দিন) এবং সারাদেশে ১৩০৳ (২–৪ দিন)।',
  },
};
