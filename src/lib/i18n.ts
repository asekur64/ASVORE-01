import type { Language, OrderStatus, PaymentMethodId, PaymentStatus } from '../types/index.ts';

export function formatBdt(amount: number, lang: Language = 'bn'): string {
  const num = Math.round(amount || 0);
  if (lang === 'bn') {
    return `৳${num.toLocaleString('bn-BD')}`;
  }
  return `৳${num.toLocaleString('en-US')}`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; bn: string }> = {
  pending: { en: 'Order Placed', bn: 'অর্ডার প্লেসড' },
  confirmed: { en: 'Order Confirmed', bn: 'অর্ডার কনফার্মড' },
  processing: { en: 'Processing', bn: 'প্রস্তুত হচ্ছে' },
  shipped: { en: 'Shipped', bn: 'শিপড হয়েছে' },
  out_for_delivery: { en: 'Out for Delivery', bn: 'ডেলিভারির পথে' },
  delivered: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
  cancelled: { en: 'Cancelled', bn: 'বাতিলকৃত' },
  returned: { en: 'Returned', bn: 'রিটার্ন হয়েছে' },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; bn: string }> = {
  pending: { en: 'Pending (COD)', bn: 'বকেয়া (ক্যাশ অন ডেলিভারি)' },
  awaiting_payment: { en: 'Awaiting Payment', bn: 'পেমেন্টের অপেক্ষায়' },
  awaiting_verification: { en: 'Verifying Transaction', bn: 'লেনদেন যাচাই চলছে' },
  paid: { en: 'Paid', bn: 'পরিশোধিত' },
  failed: { en: 'Payment Failed', bn: 'পেমেন্ট ব্যর্থ হয়েছে' },
  refund_requested: { en: 'Refund Requested', bn: 'রিফান্ড অনুরোধকৃত' },
  refunded: { en: 'Refunded', bn: 'রিফান্ড সম্পন্ন' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, { en: string; bn: string; descEn: string; descBn: string }> = {
  cod: {
    en: 'Cash on Delivery (COD)',
    bn: 'ক্যাশ অন ডেলিভারি (COD)',
    descEn: 'Pay in cash when your order arrives at your doorstep.',
    descBn: 'পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে নগদ অর্থ প্রদান করুন।',
  },
  bkash: {
    en: 'bKash',
    bn: 'বিকাশ (bKash)',
    descEn: 'Official bKash Tokenized Checkout gateway.',
    descBn: 'অফিশিয়াল বিকাশ টোকেনাইজড চেকআউট গেটওয়ে।',
  },
  nagad: {
    en: 'Nagad',
    bn: 'নগদ (Nagad)',
    descEn: 'Official Nagad Merchant Payment gateway.',
    descBn: 'অফিশিয়াল নগদ মার্চেন্ট পেমেন্ট গেটওয়ে।',
  },
  rocket: {
    en: 'Rocket (DBBL)',
    bn: 'রকেট (Rocket)',
    descEn: 'Pay via Dutch-Bangla Rocket through SSLCommerz.',
    descBn: 'এসএসএলকমার্জ গেটওয়ের মাধ্যমে রকেট পেমেন্ট।',
  },
  upay: {
    en: 'Upay',
    bn: 'উপায় (Upay)',
    descEn: 'Pay via Upay wallet through SSLCommerz.',
    descBn: 'এসএসএলকমার্জ গেটওয়ের মাধ্যমে উপায় পেমেন্ট।',
  },
  sslcommerz: {
    en: 'SSLCommerz Gateway',
    bn: 'এসএসএলকমার্জ (SSLCommerz)',
    descEn: 'All Bangladeshi MFS, Internet Banking & Cards.',
    descBn: 'সকল মোবাইল ব্যাংকিং, ইন্টারনেট ব্যাংকিং ও কার্ড।',
  },
  card: {
    en: 'Debit / Credit Card',
    bn: 'ডেবিট / ক্রেডিট কার্ড',
    descEn: 'Visa, Mastercard, AMEX via SSLCommerz.',
    descBn: 'ভিসা, মাস্টারকার্ড ও অ্যামেক্স কার্ড পেমেন্ট।',
  },
};

export const UI_TEXT = {
  nav: {
    home: { en: 'Home', bn: 'হোম' },
    shop: { en: 'Shop', bn: 'শপ' },
    clothing: { en: "Men's Clothing", bn: 'পুরুষদের পোশাক' },
    watches: { en: 'Watches', bn: 'হাতঘড়ি' },
    accessories: { en: 'Accessories', bn: 'এক্সেসরিজ' },
    newArrivals: { en: 'New Arrivals', bn: 'নতুন কালেকশন' },
    bestSellers: { en: 'Best Sellers', bn: 'সেরা বিক্রিত' },
    offers: { en: 'Offers', bn: 'অফার' },
    trackOrder: { en: 'Track Order', bn: 'অর্ডার ট্র্যাক' },
    wishlist: { en: 'Wishlist', bn: 'উইশলিস্ট' },
    account: { en: 'Account', bn: 'অ্যাকাউন্ট' },
    login: { en: 'Sign In', bn: 'লগইন' },
    admin: { en: 'Admin', bn: 'অ্যাডমিন' },
    cart: { en: 'Bag', bn: 'ব্যাগ' },
    searchPlaceholder: { en: 'Search watches, blazers, leather...', bn: 'ঘড়ি, ব্লেজার, লেদার খুঁজুন...' },
  },
  home: {
    featuredCategories: { en: 'Curated Categories', bn: 'বিশেষ ক্যাটাগরি' },
    newArrivals: { en: 'New Arrivals', bn: 'নতুন আগমন' },
    bestSellers: { en: 'Best Sellers', bn: 'সর্বাধিক বিক্রিত' },
    trending: { en: 'Trending Now', bn: 'জনপ্রিয় পণ্য' },
    specialOffers: { en: 'Special Offers', bn: 'বিশেষ ছাড়' },
    featuredCollections: { en: 'Signature Collections', bn: 'সিগনেচার কালেকশন' },
    whyChoose: { en: 'Why Choose ASVORE', bn: 'কেন আসভোর বেছে নেবেন' },
    testimonials: { en: 'Client Perspectives', bn: 'গ্রাহকদের অভিজ্ঞতা' },
    newsletterTitle: { en: 'Private Atelier Dispatch', bn: 'আসভোর প্রাইভেট আপডেট' },
    newsletterDesc: {
      en: 'Receive early access to limited menswear drops, seasonal lookbooks, and member offers.',
      bn: 'লিমিটেড মেন্সওয়্যার ড্রপ, সিজন্যাল লুকবুক এবং বিশেষ অফার সবার আগে পেতে সাবস্ক্রাইব করুন।',
    },
    subscribe: { en: 'Subscribe', bn: 'সাবস্ক্রাইব' },
    viewAll: { en: 'View All', bn: 'সব দেখুন' },
    socialTitle: { en: 'ASVORE Journal & Social', bn: 'আসভোর সোশ্যাল গ্যালারি' },
    followFacebook: { en: 'Follow Asvore on Facebook', bn: 'ফেসবুকে আসভোর ফলো করুন' },
  },
  product: {
    addToCart: { en: 'Add to Bag', bn: 'ব্যাগে যোগ করুন' },
    buyNow: { en: 'Buy Now', bn: 'এখনই কিনুন' },
    inStock: { en: 'In Stock', bn: 'স্টকে আছে' },
    outOfStock: { en: 'Out of Stock', bn: 'স্টক শেষ' },
    lowStock: { en: 'Limited Stock', bn: 'সীমিত স্টক' },
    sku: { en: 'SKU', bn: 'এসকেইউ' },
    size: { en: 'Size', bn: 'সাইজ' },
    color: { en: 'Finish / Color', bn: 'রঙ / ফিনিশ' },
    quantity: { en: 'Quantity', bn: 'পরিমাণ' },
    specifications: { en: 'Specifications', bn: 'বৈশিষ্ট্য ও স্পেসিফিকেশন' },
    description: { en: 'Craftsmanship & Details', bn: 'বিবরণ ও কারুকার্য' },
    reviews: { en: 'Verified Reviews', bn: 'গ্রাহক রিভিউ' },
    writeReview: { en: 'Submit a Review', bn: 'রিভিউ লিখুন' },
    related: { en: 'Complementary Pieces', bn: 'সংশ্লিষ্ট পণ্য' },
    recommended: { en: 'Recommended For You', bn: 'আপনার জন্য প্রস্তাবিত' },
    savePct: { en: 'OFF', bn: 'ছাড়' },
  },
  cart: {
    title: { en: 'Your Shopping Bag', bn: 'আপনার শপিং ব্যাগ' },
    empty: { en: 'Your bag is currently empty.', bn: 'আপনার শপিং ব্যাগটি খালি।' },
    subtotal: { en: 'Subtotal', bn: 'সাবটোটাল' },
    discount: { en: 'Discount', bn: 'ডিসকাউন্ট' },
    delivery: { en: 'Delivery Charge', bn: 'ডেলিভারি চার্জ' },
    total: { en: 'Grand Total', bn: 'সর্বমোট' },
    couponPlaceholder: { en: 'Enter coupon code (e.g. ASVORE10)', bn: 'কুপন কোড লিখুন (যেমন ASVORE10)' },
    applyCoupon: { en: 'Apply', bn: 'প্রয়োগ করুন' },
    continueShopping: { en: 'Continue Shopping', bn: 'শপিং চালিয়ে যান' },
    proceedCheckout: { en: 'Proceed to Checkout', bn: 'চেকআউট করুন' },
  },
  checkout: {
    title: { en: 'Checkout & Delivery', bn: 'চেকআউট ও ডেলিভারি তথ্য' },
    fullName: { en: 'Full Name', bn: 'পূর্ণ নাম' },
    phone: { en: 'Mobile Number (01XXXXXXXXX)', bn: 'মোবাইল নম্বর (০১XXXXXXXXX)' },
    email: { en: 'Email Address', bn: 'ইমেইল ঠিকানা' },
    district: { en: 'District', bn: 'জেলা' },
    upazila: { en: 'Upazila / Thana', bn: 'উপজেলা / থানা' },
    deliveryArea: { en: 'Area / Road / Landmark', bn: 'এলাকা / রোড / ল্যান্ডমার্ক' },
    streetAddress: { en: 'Complete Delivery Address', bn: 'সম্পূর্ণ ডেলিভারি ঠিকানা' },
    notes: { en: 'Order Notes (Optional)', bn: 'অর্ডার নোট (ঐচ্ছিক)' },
    insideGaibandha: { en: 'Inside Gaibandha', bn: 'গাইবান্ধার ভেতরে' },
    outsideGaibandha: { en: 'Outside Gaibandha', bn: 'গাইবান্ধার বাইরে (সারাদেশ)' },
    savedAddresses: { en: 'Select Saved Address', bn: 'সংরক্ষিত ঠিকানা বেছে নিন' },
    paymentMethod: { en: 'Payment Method', bn: 'পেমেন্ট পদ্ধতি' },
    placeOrder: { en: 'Confirm & Place Order', bn: 'অর্ডার কনফার্ম করুন' },
    guestNotice: {
      en: 'Ordering as Guest — you can track anytime using your Order ID & phone number.',
      bn: 'গেস্ট হিসেবে অর্ডার করছেন — অর্ডার আইডি ও মোবাইল নম্বর দিয়ে যেকোনো সময় ট্র্যাক করতে পারবেন।',
    },
  },
  footer: {
    quickLinks: { en: 'Navigation', bn: 'দ্রুত লিংক' },
    categories: { en: 'Collections', bn: 'কালেকশন' },
    support: { en: 'Client Care', bn: 'গ্রাহক সেবা' },
    policies: { en: 'Policies', bn: 'নীতিমালা' },
    privacy: { en: 'Privacy Policy', bn: 'প্রাইভেসি পলিসি' },
    terms: { en: 'Terms & Conditions', bn: 'শর্তাবলী' },
    returns: { en: 'Return & Refund Policy', bn: 'রিটার্ন ও রিফান্ড নীতি' },
    shipping: { en: 'Shipping Policy', bn: 'শিপিং নীতিমালা' },
    faq: { en: 'FAQ', bn: 'সাধারণ জিজ্ঞাসা' },
    about: { en: 'About ASVORE', bn: 'আমাদের সম্পর্কে' },
    contact: { en: 'Contact Us', bn: 'যোগাযোগ' },
    rights: { en: 'All rights reserved.', bn: 'সর্বস্বত্ব সংরক্ষিত।' },
  },
} as const;

export function t(entry: { en: string; bn: string }, lang: Language): string {
  return lang === 'bn' ? entry.bn : entry.en;
}

export const ADMIN_TEXT = {
  brandSub: { en: 'Admin Console', bn: 'অ্যাডমিন কনসোল' },
  viewStorefront: { en: 'View Storefront', bn: 'স্টোরফ্রন্ট দেখুন' },
  darkMode: { en: 'Dark Mode', bn: 'ডার্ক মোড' },
  lightMode: { en: 'Light Mode', bn: 'লাইট মোড' },
  signOut: { en: 'Logout', bn: 'লগআউট' },
  verifyingSession: { en: 'Verifying Admin Session...', bn: 'অ্যাডমিন সেশন যাচাই হচ্ছে...' },
  unauthorizedTitle: { en: 'Admin Portal Authentication', bn: 'অ্যাডমিন পোর্টাল লগইন' },
  unauthorizedDesc: {
    en: 'Sign in with an authorized ASVORE administrator account to access operations.',
    bn: 'অপারেশন প্যানেল ব্যবহার করতে অনুমোদিত ASVORE অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন।',
  },
  tabs: {
    overview: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
    orders: { en: 'Orders', bn: 'অর্ডার সমূহ' },
    customers: { en: 'Customers', bn: 'গ্রাহক তালিকা' },
    products: { en: 'Products', bn: 'পণ্য ব্যবস্থাপনা' },
    categoriesCoupons: { en: 'Categories & Coupons', bn: 'ক্যাটাগরি ও কুপন' },
    paymentsShipping: { en: 'Payments & Shipping', bn: 'পেমেন্ট ও ডেলিভারি' },
    cmsSettings: { en: 'CMS & Settings', bn: 'কনটেন্ট ও সেটিংস' },
    notificationsLogs: { en: 'Alerts & Audit Logs', bn: 'অ্যালার্ট ও অডিট লগ' },
  },
  dateFilters: {
    today: { en: 'Today', bn: 'আজ' },
    yesterday: { en: 'Yesterday', bn: 'গতকাল' },
    '7d': { en: 'Last 7 Days', bn: 'গত ৭ দিন' },
    '30d': { en: 'Last 30 Days', bn: 'গত ৩০ দিন' },
    month: { en: 'This Month', bn: 'এই মাস' },
    last_month: { en: 'Last Month', bn: 'গত মাস' },
    custom: { en: 'Custom Range', bn: 'কাস্টম তারিখ' },
  },
  kpis: {
    totalRevenue: { en: 'Total Revenue', bn: 'মোট আয়' },
    todaysRevenue: { en: "Today's Revenue", bn: 'আজকের আয়' },
    monthlyRevenue: { en: 'Monthly Revenue', bn: 'মাসিক আয়' },
    totalOrders: { en: 'Total Orders', bn: 'মোট অর্ডার' },
    pendingOrders: { en: 'Pending', bn: 'পেন্ডিং' },
    confirmedOrders: { en: 'Confirmed', bn: 'কনফার্মড' },
    processingOrders: { en: 'Processing', bn: 'প্রসেসিং' },
    shippedOrders: { en: 'Shipped', bn: 'শিপড' },
    deliveredOrders: { en: 'Delivered', bn: 'ডেলিভারড' },
    cancelledOrders: { en: 'Cancelled', bn: 'বাতিল' },
    totalCustomers: { en: 'Total Customers', bn: 'মোট গ্রাহক' },
    newCustomers: { en: 'New Customers', bn: 'নতুন গ্রাহক' },
    totalProducts: { en: 'Total Products', bn: 'মোট পণ্য' },
    activeProducts: { en: 'Active Products', bn: 'সক্রিয় পণ্য' },
    outOfStockProducts: { en: 'Out of Stock', bn: 'স্টক শেষ' },
    lowStockProducts: { en: 'Low Stock', bn: 'সীমিত স্টক' },
  },
  common: {
    save: { en: 'Save Changes', bn: 'সংরক্ষণ করুন' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    delete: { en: 'Delete', bn: 'মুছে ফেলুন' },
    edit: { en: 'Edit', bn: 'সম্পাদনা' },
    confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    search: { en: 'Search...', bn: 'খুঁজুন...' },
    loading: { en: 'Loading data...', bn: 'তথ্য লোড হচ্ছে...' },
    noData: { en: 'No records found.', bn: 'কোনো তথ্য পাওয়া যায়নি।' },
    exportCsv: { en: 'Export CSV', bn: 'সিএসভি ডাউনলোড' },
    print: { en: 'Print Invoice', bn: 'ইনভয়েস প্রিন্ট' },
  },
} as const;

