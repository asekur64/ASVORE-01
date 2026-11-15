export type Language = 'bn' | 'en';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'awaiting_verification'
  | 'paid'
  | 'failed'
  | 'refund_requested'
  | 'refunded';

export type PaymentMethodId =
  | 'cod'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'sslcommerz'
  | 'card';

export type AdminRole = 'super_admin' | 'admin' | 'order_manager' | 'product_manager';

export interface ProductVariation {
  id: string;
  size?: string;
  color?: string;
  colorHex?: string;
  sku?: string;
  stock: number;
  priceDelta?: number;
}

export interface ProductSpec {
  labelEn: string;
  labelBn: string;
  valueEn: string;
  valueBn: string;
}

export interface StockHistoryEntry {
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  actorEmail: string;
  timestamp: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  categoryId: string;
  subcategoryId?: string;
  brand: string;
  regularPrice: number;
  discountPrice: number | null;
  images: string[];
  sizes: string[];
  colors: { nameEn: string; nameBn: string; hex: string }[];
  variations?: ProductVariation[];
  specifications: ProductSpec[];
  weight?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  stock: number;
  lowStockThreshold: number;
  stockHistory?: StockHistoryEntry[];
  featured: boolean;
  bestSeller: boolean;
  trending: boolean;
  newArrival: boolean;
  published: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  parentId?: string;
  image: string;
  sortOrder: number;
}

export interface CartItem {
  productId: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  image: string;
  unitPrice: number;
  regularPrice: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  photoUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  district: string;
  upazila: string;
  deliveryArea?: string;
  streetAddress: string;
  isDefault?: boolean;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  titleEn: string;
  titleBn: string;
  noteEn?: string;
  noteBn?: string;
  actorEmail?: string;
  timestamp: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  image: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: {
    district: string;
    upazila: string;
    deliveryArea: string;
    streetAddress: string;
    deliveryZone: 'inside_gaibandha' | 'outside_gaibandha';
  };
  orderNotes?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  deliveryCharge: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  transactionId?: string | null;
  courierName?: string | null;
  trackingCode?: string | null;
  estimatedDelivery?: string | null;
  internalNotes?: string | null;
  stockRestored?: boolean;
  timeline: OrderTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type:
    | 'order_confirmation'
    | 'payment_confirmation'
    | 'order_status'
    | 'shipping'
    | 'delivery'
    | 'promo'
    | 'discount'
    | 'announcement';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  read: boolean;
  orderNumber?: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'new_customer' | 'payment_received' | 'payment_failed' | 'low_stock' | 'order_cancelled' | 'refund_request';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  recordId?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  adminName: string;
  actionType: string;
  description: string;
  recordId?: string;
  timestamp: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

export interface ShippingSettings {
  insideGaibandhaCharge: number;
  outsideGaibandhaCharge: number;
  freeShippingThreshold: number;
  estimatedDaysInside: string;
  estimatedDaysOutside: string;
  districtOverrides: Record<string, number>;
  upazilaOverrides?: Record<string, number>;
  couriers?: string[];
}

export interface ManualMfsConfig {
  enabled: boolean;
  methodName: string;
  accountNumber: string;
  instructionsEn: string;
  instructionsBn: string;
  logoUrl?: string;
}

export interface PublicGatewayFlags {
  defaultMethod: PaymentMethodId;
  codEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  rocketEnabled: boolean;
  upayEnabled: boolean;
  sslcommerzEnabled: boolean;
  cardEnabled: boolean;
  manualMfs?: Record<string, ManualMfsConfig>;
}

export interface TestimonialItem {
  id: string;
  name: string;
  roleEn: string;
  roleBn: string;
  location: string;
  quoteEn: string;
  quoteBn: string;
  rating: number;
}

export interface FaqItem {
  id: string;
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
}

export interface NavLinkItem {
  labelEn: string;
  labelBn: string;
  href: string;
}

export interface SiteSettings {
  companyName: string;
  websiteName?: string;
  taglineEn: string;
  taglineBn: string;
  contactNumber: string;
  email: string;
  addressEn: string;
  addressBn: string;
  facebookUrl: string;
  instagramUrl: string;
  logoUrl: string;
  faviconUrl: string;
  currencySymbol: string;
  defaultLanguage: Language;
  maintenanceMode: boolean;
  taxRatePercent: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  headerMenu?: NavLinkItem[];
  footerMenu?: NavLinkItem[];
  hero: {
    badgeEn: string;
    badgeBn: string;
    headlineEn: string;
    headlineBn: string;
    subheadlineEn: string;
    subheadlineBn: string;
    primaryCtaEn: string;
    primaryCtaBn: string;
    secondaryCtaEn: string;
    secondaryCtaBn: string;
    bannerImage: string;
  };
  promoBanner: {
    enabled: boolean;
    textEn: string;
    textBn: string;
    subtextEn: string;
    subtextBn: string;
    ctaLabelEn: string;
    ctaLabelBn: string;
    ctaLink: string;
    bannerImage: string;
  };
  aboutEn: string;
  aboutBn: string;
  testimonials: TestimonialItem[];
  faqs: FaqItem[];
  policies: {
    privacyEn: string;
    privacyBn: string;
    termsEn: string;
    termsBn: string;
    returnEn: string;
    returnBn: string;
    shippingEn: string;
    shippingBn: string;
  };
}
