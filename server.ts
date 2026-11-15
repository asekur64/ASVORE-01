import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import {
  SEED_CATEGORIES,
  SEED_COUPONS,
  SEED_GATEWAY_FLAGS,
  SEED_PRODUCTS,
  SEED_SHIPPING,
  SEED_SITE_SETTINGS,
} from './src/lib/seedData.ts';
import { isValidBdPhone, normalizeBdPhone } from './src/lib/bangladeshGeo.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'asekurr60@gmail.com';

const adminApp = getAdminApps().length
  ? getAdminApps()[0]
  : initializeAdminApp({ projectId: firebaseConfig.projectId });

const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple sliding-window in-memory rate limiter
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxHits: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const list = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (list.length >= maxHits) {
      res.status(429).json({
        error: 'Too many requests. Please wait before trying again.',
        errorBn: 'অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      });
      return;
    }
    list.push(now);
    rateBuckets.set(key, list);
    next();
  };
}

function sanitizeText(input: unknown, maxLen = 400): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLen);
}

interface AuthedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

interface AuthedRequest extends express.Request {
  authUser?: AuthedUser;
  adminRole?: string;
}

async function extractOptionalUser(req: express.Request): Promise<AuthedUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
      name: decoded.name || '',
    };
  } catch {
    return null;
  }
}

async function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const user = await extractOptionalUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAdmin(allowedRoles: string[]) {
  return async (req: AuthedRequest, res: express.Response, next: express.NextFunction) => {
    const user = await extractOptionalUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.authUser = user;
    if (user.email === BOOTSTRAP_SUPER_ADMIN_EMAIL && user.emailVerified) {
      req.adminRole = 'super_admin';
      next();
      return;
    }
    const adminSnap = await adminDb.collection('admins').doc(user.uid).get();
    if (!adminSnap.exists) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    const data = adminSnap.data() || {};
    if (!data.active || !allowedRoles.includes(String(data.role))) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    req.adminRole = String(data.role);
    next();
  };
}

let seededOnce = false;
async function ensureSeeded() {
  if (seededOnce) return;
  try {
    const prodSnap = await adminDb.collection('products').limit(1).get();
    if (prodSnap.empty) {
      const batch = adminDb.batch();
      for (const cat of SEED_CATEGORIES) {
        batch.set(adminDb.collection('categories').doc(cat.id), {
          ...cat,
          createdAt: new Date().toISOString(),
        });
      }
      for (const prod of SEED_PRODUCTS) {
        batch.set(adminDb.collection('products').doc(prod.id), {
          ...prod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      for (const coupon of SEED_COUPONS) {
        batch.set(adminDb.collection('coupons').doc(coupon.id), {
          ...coupon,
          createdAt: new Date().toISOString(),
        });
      }
      batch.set(adminDb.collection('settings').doc('site'), SEED_SITE_SETTINGS);
      batch.set(adminDb.collection('settings').doc('shipping'), SEED_SHIPPING);
      batch.set(adminDb.collection('settings').doc('payment_gateways_public'), SEED_GATEWAY_FLAGS);
      await batch.commit();
    } else {
      // Ensure essential settings docs exist
      const [siteDoc, shipDoc, gwDoc] = await Promise.all([
        adminDb.collection('settings').doc('site').get(),
        adminDb.collection('settings').doc('shipping').get(),
        adminDb.collection('settings').doc('payment_gateways_public').get(),
      ]);
      if (!siteDoc.exists) await adminDb.collection('settings').doc('site').set(SEED_SITE_SETTINGS);
      if (!shipDoc.exists) await adminDb.collection('settings').doc('shipping').set(SEED_SHIPPING);
      if (!gwDoc.exists) await adminDb.collection('settings').doc('payment_gateways_public').set(SEED_GATEWAY_FLAGS);
    }
    seededOnce = true;
  } catch (err) {
    console.error('Seed check error:', err);
  }
}

function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

async function getGatewayCredentials() {
  const privSnap = await adminDb.collection('settings_private').doc('payment_gateways').get();
  const saved = privSnap.exists ? privSnap.data() || {} : {};
  return {
    sslcommerz: {
      storeId: saved.sslcommerzStoreId || process.env.SSLCOMMERZ_STORE_ID || '',
      storePasswd: saved.sslcommerzStorePasswd || process.env.SSLCOMMERZ_STORE_PASSWD || '',
      sandbox: saved.sslcommerzSandbox !== undefined ? Boolean(saved.sslcommerzSandbox) : process.env.SSLCOMMERZ_SANDBOX !== 'false',
    },
    bkash: {
      appKey: saved.bkashAppKey || process.env.BKASH_APP_KEY || '',
      appSecret: saved.bkashAppSecret || process.env.BKASH_APP_SECRET || '',
      username: saved.bkashUsername || process.env.BKASH_USERNAME || '',
      password: saved.bkashPassword || process.env.BKASH_PASSWORD || '',
      sandbox: saved.bkashSandbox !== undefined ? Boolean(saved.bkashSandbox) : process.env.BKASH_SANDBOX !== 'false',
    },
    nagad: {
      merchantId: saved.nagadMerchantId || process.env.NAGAD_MERCHANT_ID || '',
      merchantNumber: saved.nagadMerchantNumber || process.env.NAGAD_MERCHANT_NUMBER || '',
      publicKey: saved.nagadPublicKey || process.env.NAGAD_PUBLIC_KEY || '',
      privateKey: saved.nagadPrivateKey || process.env.NAGAD_PRIVATE_KEY || '',
      sandbox: saved.nagadSandbox !== undefined ? Boolean(saved.nagadSandbox) : process.env.NAGAD_SANDBOX !== 'false',
    },
  };
}

async function createUserNotification(
  userId: string | null,
  payload: {
    type: string;
    titleEn: string;
    titleBn: string;
    bodyEn: string;
    bodyBn: string;
    orderNumber?: string;
  }
) {
  if (!userId) return;
  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .add({
        ...payload,
        read: false,
        createdAt: new Date().toISOString(),
      });
  } catch (err) {
    console.error('Notification write failed:', err);
  }
}

async function createAdminNotification(payload: {
  type:
    | 'new_order'
    | 'new_customer'
    | 'payment_received'
    | 'payment_failed'
    | 'low_stock'
    | 'order_cancelled'
    | 'refund_request';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  recordId?: string;
}) {
  try {
    await adminDb.collection('admin_notifications').add({
      ...payload,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Admin notification write failed:', err);
  }
}

async function writeAuditLog(
  req: AuthedRequest,
  actionType: string,
  description: string,
  recordId?: string
) {
  try {
    const actor = req.authUser;
    await adminDb.collection('audit_logs').add({
      adminUid: actor?.uid || 'system',
      adminEmail: actor?.email || 'system',
      adminName: actor?.name || actor?.email || 'Administrator',
      actionType,
      description: sanitizeText(description, 500),
      recordId: recordId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}

// Health & Bootstrap
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'asvore-api' });
});

app.get('/api/bootstrap', async (_req, res) => {
  await ensureSeeded();
  res.json({ ok: true });
});

// Dynamic Sitemap & Robots for SEO
app.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (req, res) => {
  await ensureSeeded();
  const baseUrl = getBaseUrl(req);
  const prods = await adminDb.collection('products').where('published', '==', true).get();
  const staticUrls = ['', '/shop', '/track-order', '/about', '/contact'];
  const urls = [
    ...staticUrls.map((u) => `<url><loc>${baseUrl}${u}</loc><changefreq>weekly</changefreq></url>`),
    ...prods.docs.map(
      (d) => `<url><loc>${baseUrl}/product/${d.data().slug}</loc><changefreq>daily</changefreq></url>`
    ),
  ].join('');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  );
});

// Server-side Coupon Validation
app.post('/api/coupons/validate', rateLimit(30, 60_000), async (req, res) => {
  try {
    await ensureSeeded();
    const code = sanitizeText(req.body?.code, 40).toUpperCase();
    const subtotal = Number(req.body?.subtotal || 0);
    if (!code) {
      res.status(400).json({ error: 'Coupon code is required', errorBn: 'কুপন কোড লিখুন' });
      return;
    }
    const snap = await adminDb.collection('coupons').where('code', '==', code).limit(1).get();
    if (snap.empty) {
      res.status(404).json({ error: 'Invalid coupon code', errorBn: 'অবৈধ কুপন কোড' });
      return;
    }
    const coupon = snap.docs[0].data();
    if (!coupon.active) {
      res.status(400).json({ error: 'Coupon is inactive', errorBn: 'এই কুপনটি সক্রিয় নয়' });
      return;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'Coupon has expired', errorBn: 'কুপনের মেয়াদ শেষ হয়েছে' });
      return;
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ error: 'Coupon usage limit reached', errorBn: 'কুপন ব্যবহারের সীমা শেষ' });
      return;
    }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      res.status(400).json({
        error: `Minimum order ৳${coupon.minOrderAmount} required`,
        errorBn: `ন্যূনতম ৳${coupon.minOrderAmount} টাকার অর্ডার প্রয়োজন`,
      });
      return;
    }
    let discount =
      coupon.type === 'percentage' ? Math.round((subtotal * Number(coupon.value)) / 100) : Number(coupon.value);
    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
      discount = Number(coupon.maxDiscount);
    }
    discount = Math.min(discount, subtotal);
    res.json({
      valid: true,
      code: coupon.code,
      discount,
      type: coupon.type,
      value: coupon.value,
    });
  } catch (err) {
    console.error('Coupon validate error:', err);
    res.status(500).json({ error: 'Could not validate coupon' });
  }
});

// Server-Authoritative Order Placement & Official Gateway Dispatch
app.post('/api/orders/create', rateLimit(20, 60_000), async (req, res) => {
  try {
    await ensureSeeded();
    const authedUser = await extractOptionalUser(req);
    const body = req.body || {};
    const customerName = sanitizeText(body.customerName, 120);
    const customerPhone = normalizeBdPhone(sanitizeText(body.customerPhone, 30));
    const customerEmail = sanitizeText(body.customerEmail, 160);
    const district = sanitizeText(body.district, 80);
    const upazila = sanitizeText(body.upazila, 80);
    const deliveryArea = sanitizeText(body.deliveryArea, 120);
    const streetAddress = sanitizeText(body.streetAddress, 300);
    const orderNotes = sanitizeText(body.orderNotes, 400);
    const paymentMethod = sanitizeText(body.paymentMethod, 30) as string;
    const couponCode = sanitizeText(body.couponCode, 40).toUpperCase();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !isValidBdPhone(customerPhone) || !district || !upazila || !streetAddress) {
      res.status(400).json({
        error: 'Please complete all required delivery details with a valid Bangladesh mobile number.',
        errorBn: 'সঠিক বাংলাদেশি মোবাইল নম্বরসহ ডেলিভারির সব প্রয়োজনীয় তথ্য দিন।',
      });
      return;
    }

    if (!rawItems.length || rawItems.length > 30) {
      res.status(400).json({ error: 'Cart is empty', errorBn: 'কার্ট খালি রয়েছে' });
      return;
    }

    // Check gateway availability
    const gwFlagsSnap = await adminDb.collection('settings').doc('payment_gateways_public').get();
    const gwFlags = gwFlagsSnap.exists ? gwFlagsSnap.data() || {} : SEED_GATEWAY_FLAGS;
    const allowedMethods = ['cod', 'bkash', 'nagad', 'rocket', 'upay', 'sslcommerz', 'card'];
    if (!allowedMethods.includes(paymentMethod)) {
      res.status(400).json({ error: 'Unsupported payment method' });
      return;
    }
    const methodFlagKey = `${paymentMethod}Enabled`;
    if ((gwFlags as Record<string, unknown>)[methodFlagKey] === false) {
      res.status(400).json({
        error: 'Selected payment method is currently disabled.',
        errorBn: 'নির্বাচিত পেমেন্ট পদ্ধতিটি বর্তমানে বন্ধ আছে।',
      });
      return;
    }

    // Recompute authoritative prices & validate stock from Firestore
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const rawItem of rawItems) {
      const productId = sanitizeText(rawItem?.productId, 128);
      const quantity = Math.max(1, Math.min(20, Math.floor(Number(rawItem?.quantity || 1))));
      const prodDoc = await adminDb.collection('products').doc(productId).get();
      if (!prodDoc.exists) {
        res.status(400).json({ error: `Product not found: ${productId}` });
        return;
      }
      const p = prodDoc.data()!;
      if (!p.published) {
        res.status(400).json({ error: `Product unavailable: ${p.nameEn}` });
        return;
      }
      if (Number(p.stock) < quantity) {
        res.status(400).json({
          error: `Insufficient stock for ${p.nameEn} (Available: ${p.stock})`,
          errorBn: `${p.nameBn} পর্যাপ্ত স্টকে নেই (উপলব্ধ: ${p.stock})`,
        });
        return;
      }
      const unitPrice = p.discountPrice !== null && p.discountPrice !== undefined && Number(p.discountPrice) > 0
        ? Number(p.discountPrice)
        : Number(p.regularPrice);
      subtotal += unitPrice * quantity;
      orderItems.push({
        productId,
        slug: p.slug,
        sku: p.sku,
        nameEn: p.nameEn,
        nameBn: p.nameBn,
        image: Array.isArray(p.images) && p.images[0] ? p.images[0] : '',
        unitPrice,
        quantity,
        size: sanitizeText(rawItem?.size, 30) || '',
        color: sanitizeText(rawItem?.color, 40) || '',
      });
    }

    // Validate Coupon Server-Side
    let discount = 0;
    let appliedCouponDocId: string | null = null;
    if (couponCode) {
      const cSnap = await adminDb.collection('coupons').where('code', '==', couponCode).limit(1).get();
      if (!cSnap.empty) {
        const cDoc = cSnap.docs[0];
        const c = cDoc.data();
        const notExpired = !c.expiresAt || new Date(c.expiresAt).getTime() >= Date.now();
        const underLimit = !c.usageLimit || Number(c.usedCount || 0) < Number(c.usageLimit);
        if (c.active && notExpired && underLimit && subtotal >= Number(c.minOrderAmount || 0)) {
          discount =
            c.type === 'percentage' ? Math.round((subtotal * Number(c.value)) / 100) : Number(c.value);
          if (c.maxDiscount && discount > Number(c.maxDiscount)) {
            discount = Number(c.maxDiscount);
          }
          discount = Math.min(discount, subtotal);
          appliedCouponDocId = cDoc.id;
        }
      }
    }

    // Compute Delivery Charge Server-Side
    const shipSnap = await adminDb.collection('settings').doc('shipping').get();
    const ship = shipSnap.exists ? shipSnap.data() || SEED_SHIPPING : SEED_SHIPPING;
    const isGaibandha = district.toLowerCase() === 'gaibandha';
    const deliveryZone = isGaibandha ? 'inside_gaibandha' : 'outside_gaibandha';
    let deliveryCharge = isGaibandha
      ? Number(ship.insideGaibandhaCharge ?? 60)
      : Number(ship.outsideGaibandhaCharge ?? 130);
    if (ship.districtOverrides && typeof ship.districtOverrides[district] === 'number') {
      deliveryCharge = Number(ship.districtOverrides[district]);
    }
    if (ship.upazilaOverrides && typeof ship.upazilaOverrides[upazila] === 'number') {
      deliveryCharge = Number(ship.upazilaOverrides[upazila]);
    }
    if (Number(ship.freeShippingThreshold) > 0 && subtotal - discount >= Number(ship.freeShippingThreshold)) {
      deliveryCharge = 0;
    }

    // Tax calculation from site settings
    const siteSnap = await adminDb.collection('settings').doc('site').get();
    const siteData = siteSnap.exists ? siteSnap.data() || {} : {};
    const taxRate = Number(siteData.taxRatePercent || 0);
    const taxAmount = taxRate > 0 ? Math.round(((subtotal - discount) * taxRate) / 100) : 0;
    const grandTotal = Math.max(0, subtotal - discount + deliveryCharge + taxAmount);

    // Check online payment gateway readiness BEFORE creating order if online method selected
    const creds = await getGatewayCredentials();
    const baseUrl = getBaseUrl(req);
    const orderNumber = `ASV-${new Date().toISOString().slice(2, 7).replace('-', '')}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    if (paymentMethod === 'bkash') {
      if (!creds.bkash.appKey || !creds.bkash.appSecret || !creds.bkash.username || !creds.bkash.password) {
        res.status(422).json({
          errorCode: 'GATEWAY_NOT_CONFIGURED',
          error:
            'bKash Merchant Sandbox/Live credentials are not configured on the server yet. Please configure them in Admin → Payment Gateways or choose Cash on Delivery.',
          errorBn:
            'বিকাশ মার্চেন্ট এপিআই ক্রেডেনশিয়াল এখনো কনফিগার করা হয়নি। অনুগ্রহ করে অ্যাডমিন প্যানেলে সেটআপ করুন অথবা ক্যাশ অন ডেলিভারি বেছে নিন।',
        });
        return;
      }
    } else if (paymentMethod === 'nagad') {
      if (!creds.nagad.merchantId || !creds.nagad.privateKey || !creds.nagad.publicKey) {
        res.status(422).json({
          errorCode: 'GATEWAY_NOT_CONFIGURED',
          error:
            'Nagad Merchant API credentials are not configured on the server yet. Please configure them in Admin → Payment Gateways or choose Cash on Delivery.',
          errorBn:
            'নগদ মার্চেন্ট এপিআই ক্রেডেনশিয়াল এখনো কনফিগার করা হয়নি। অনুগ্রহ করে অ্যাডমিন প্যানেলে সেটআপ করুন অথবা ক্যাশ অন ডেলিভারি বেছে নিন।',
        });
        return;
      }
    } else if (['sslcommerz', 'card', 'rocket', 'upay'].includes(paymentMethod)) {
      if (!creds.sslcommerz.storeId || !creds.sslcommerz.storePasswd) {
        res.status(422).json({
          errorCode: 'GATEWAY_NOT_CONFIGURED',
          error:
            'SSLCommerz Store ID & Password are not configured on the server yet. Please add sandbox credentials in Admin → Payment Gateways or choose Cash on Delivery.',
          errorBn:
            'এসএসএলকমার্জ স্টোর আইডি ও পাসওয়ার্ড এখনো সেট করা হয়নি। অ্যাডমিন প্যানেল থেকে স্যান্ডবক্স ক্রেডেনশিয়াল দিন অথবা ক্যাশ অন ডেলিভারি বেছে নিন।',
        });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const orderId = adminDb.collection('orders').doc().id;

    // Atomically write order & decrement stock
    await adminDb.runTransaction(async (tx) => {
      for (const item of orderItems) {
        const pRef = adminDb.collection('products').doc(item.productId);
        const pSnap = await tx.get(pRef);
        const curStock = Number(pSnap.data()?.stock || 0);
        if (curStock < item.quantity) {
          throw new Error(`Out of stock: ${item.nameEn}`);
        }
        tx.update(pRef, {
          stock: curStock - item.quantity,
          soldCount: FieldValue.increment(item.quantity),
          updatedAt: nowIso,
        });
      }
      if (appliedCouponDocId) {
        tx.update(adminDb.collection('coupons').doc(appliedCouponDocId), {
          usedCount: FieldValue.increment(1),
        });
      }
      tx.set(adminDb.collection('orders').doc(orderId), {
        id: orderId,
        orderNumber,
        userId: authedUser?.uid || null,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress: {
          district,
          upazila,
          deliveryArea,
          streetAddress,
          deliveryZone,
        },
        orderNotes,
        items: orderItems,
        subtotal,
        discount,
        couponCode: appliedCouponDocId ? couponCode : null,
        deliveryCharge,
        taxAmount,
        grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
        orderStatus: 'pending',
        transactionId: null,
        courierName: null,
        trackingCode: null,
        estimatedDelivery: isGaibandha
          ? String(ship.estimatedDaysInside || '1–2 Days')
          : String(ship.estimatedDaysOutside || '2–4 Days'),
        internalNotes: '',
        timeline: [
          {
            status: 'pending',
            titleEn: 'Order Placed',
            titleBn: 'অর্ডার প্লেসড হয়েছে',
            noteEn: `Order ${orderNumber} received via ${paymentMethod.toUpperCase()}.`,
            noteBn: `অর্ডার ${orderNumber} (${paymentMethod.toUpperCase()}) সফলভাবে গৃহীত হয়েছে।`,
            timestamp: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    // Emit admin new-order alert + low stock check
    await createAdminNotification({
      type: 'new_order',
      titleEn: `New Order ${orderNumber}`,
      titleBn: `নতুন অর্ডার ${orderNumber}`,
      bodyEn: `${customerName} placed a ৳${grandTotal} order via ${paymentMethod.toUpperCase()}.`,
      bodyBn: `${customerName} ${paymentMethod.toUpperCase()} মাধ্যমে ৳${grandTotal} টাকার অর্ডার করেছেন।`,
      recordId: orderId,
    });

    for (const item of orderItems) {
      const pCheck = await adminDb.collection('products').doc(item.productId).get();
      const pd = pCheck.data();
      if (pd && Number(pd.stock) <= Number(pd.lowStockThreshold || 5)) {
        await createAdminNotification({
          type: 'low_stock',
          titleEn: `Low Stock: ${pd.nameEn}`,
          titleBn: `সীমিত স্টক: ${pd.nameBn}`,
          bodyEn: `Only ${pd.stock} unit(s) remaining for SKU ${pd.sku}.`,
          bodyBn: `SKU ${pd.sku}-এর মাত্র ${pd.stock}টি স্টকে বাকি আছে।`,
          recordId: item.productId,
        });
      }
    }

    // If COD, send notification & complete immediately
    if (paymentMethod === 'cod') {
      await createUserNotification(authedUser?.uid || null, {
        type: 'order_confirmation',
        titleEn: `Order Confirmed: ${orderNumber}`,
        titleBn: `অর্ডার গৃহীত হয়েছে: ${orderNumber}`,
        bodyEn: `Your COD order of ৳${grandTotal} has been placed and is awaiting confirmation.`,
        bodyBn: `আপনার ৳${grandTotal} টাকার ক্যাশ অন ডেলিভারি অর্ডারটি সফলভাবে প্লেস হয়েছে।`,
        orderNumber,
      });
      res.json({ ok: true, orderId, orderNumber, paymentMode: 'cod', grandTotal });
      return;
    }

    // Real Official SSLCommerz Payment Session Initiation
    if (['sslcommerz', 'card', 'rocket', 'upay'].includes(paymentMethod)) {
      const sslEndpoint = creds.sslcommerz.sandbox
        ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

      const form = new URLSearchParams({
        store_id: creds.sslcommerz.storeId,
        store_passwd: creds.sslcommerz.storePasswd,
        total_amount: String(grandTotal),
        currency: 'BDT',
        tran_id: orderNumber,
        success_url: `${baseUrl}/api/payments/sslcommerz/success`,
        fail_url: `${baseUrl}/api/payments/sslcommerz/fail`,
        cancel_url: `${baseUrl}/api/payments/sslcommerz/cancel`,
        ipn_url: `${baseUrl}/api/payments/sslcommerz/ipn`,
        shipping_method: 'Courier',
        product_name: orderItems.map((i) => i.nameEn).join(', ').slice(0, 200),
        product_category: 'Menswear',
        product_profile: 'physical-goods',
        cus_name: customerName,
        cus_email: customerEmail || 'customer@asvore.com',
        cus_add1: streetAddress,
        cus_city: district,
        cus_state: upazila,
        cus_postcode: '5700',
        cus_country: 'Bangladesh',
        cus_phone: customerPhone,
        ship_name: customerName,
        ship_add1: streetAddress,
        ship_city: district,
        ship_country: 'Bangladesh',
        multi_card_name: paymentMethod === 'rocket' ? 'dbblmobilebanking' : paymentMethod === 'upay' ? 'upay' : '',
      });

      const sslResp = await fetch(sslEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const sslData = (await sslResp.json()) as any;
      if (sslData?.status !== 'SUCCESS' || !sslData?.GatewayPageURL) {
        await adminDb.collection('orders').doc(orderId).update({
          paymentStatus: 'failed',
          updatedAt: new Date().toISOString(),
        });
        res.status(502).json({
          error: sslData?.failedreason || 'SSLCommerz session initiation failed.',
        });
        return;
      }

      await adminDb.collection('payments').doc(orderNumber).set({
        id: orderNumber,
        orderId,
        orderNumber,
        userId: authedUser?.uid || null,
        gateway: paymentMethod,
        amount: grandTotal,
        currency: 'BDT',
        status: 'initiated',
        sessionKey: sslData.sessionkey || null,
        createdAt: nowIso,
      });

      res.json({
        ok: true,
        orderId,
        orderNumber,
        paymentMode: 'redirect',
        redirectUrl: sslData.GatewayPageURL,
      });
      return;
    }

    // Real Official bKash Tokenized Checkout API
    if (paymentMethod === 'bkash') {
      const bkashBase = creds.bkash.sandbox
        ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
        : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

      const tokenRes = await fetch(`${bkashBase}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          username: creds.bkash.username,
          password: creds.bkash.password,
        },
        body: JSON.stringify({
          app_key: creds.bkash.appKey,
          app_secret: creds.bkash.appSecret,
        }),
      });
      const tokenJson = (await tokenRes.json()) as any;
      if (!tokenJson?.id_token) {
        res.status(502).json({ error: tokenJson?.statusMessage || 'bKash token grant failed' });
        return;
      }

      const createRes = await fetch(`${bkashBase}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: tokenJson.id_token,
          'X-APP-Key': creds.bkash.appKey,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: customerPhone,
          callbackURL: `${baseUrl}/api/payments/bkash/callback?orderNumber=${encodeURIComponent(orderNumber)}`,
          amount: String(grandTotal),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: orderNumber,
        }),
      });
      const createJson = (await createRes.json()) as any;
      if (!createJson?.bkashURL || !createJson?.paymentID) {
        res.status(502).json({ error: createJson?.statusMessage || 'bKash payment creation failed' });
        return;
      }

      await adminDb.collection('payments').doc(orderNumber).set({
        id: orderNumber,
        orderId,
        orderNumber,
        userId: authedUser?.uid || null,
        gateway: 'bkash',
        paymentID: createJson.paymentID,
        amount: grandTotal,
        currency: 'BDT',
        status: 'initiated',
        createdAt: nowIso,
      });

      res.json({
        ok: true,
        orderId,
        orderNumber,
        paymentMode: 'redirect',
        redirectUrl: createJson.bkashURL,
      });
      return;
    }

    // Nagad Gateway Checkout API
    if (paymentMethod === 'nagad') {
      res.status(422).json({
        errorCode: 'GATEWAY_REQUIRES_RSA_SIGNING',
        error:
          'Nagad checkout requires live merchant RSA key-pair signing configured in environment secrets. Please use SSLCommerz, bKash, or Cash on Delivery.',
      });
    }
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err?.message || 'Order creation failed' });
  }
});

// SSLCommerz Server-Side Verification Callbacks
async function verifySslcommerzPayment(valId: string, tranId: string) {
  const creds = await getGatewayCredentials();
  const validateUrl = creds.sslcommerz.sandbox
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

  const url = `${validateUrl}?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(
    creds.sslcommerz.storeId
  )}&store_passwd=${encodeURIComponent(creds.sslcommerz.storePasswd)}&format=json`;

  const resp = await fetch(url);
  const data = (await resp.json()) as any;
  const orderSnap = await adminDb.collection('orders').where('orderNumber', '==', tranId).limit(1).get();
  if (orderSnap.empty) return { ok: false };

  const orderDoc = orderSnap.docs[0];
  const orderData = orderDoc.data();
  const validStatus = data?.status === 'VALID' || data?.status === 'VALIDATED';
  const amountMatches = Math.abs(Number(data?.amount || 0) - Number(orderData.grandTotal)) < 1;

  if (validStatus && amountMatches && data?.currency === 'BDT') {
    const nowIso = new Date().toISOString();
    await orderDoc.ref.update({
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      transactionId: data.bank_tran_id || valId,
      timeline: FieldValue.arrayUnion({
        status: 'confirmed',
        titleEn: 'Payment Verified & Order Confirmed',
        titleBn: 'পেমেন্ট যাচাই সম্পন্ন ও অর্ডার কনফার্মড',
        noteEn: `Verified via SSLCommerz (Trx: ${data.bank_tran_id || valId})`,
        noteBn: `এসএসএলকমার্জের মাধ্যমে পেমেন্ট যাচাইকৃত (Trx: ${data.bank_tran_id || valId})`,
        timestamp: nowIso,
      }),
      updatedAt: nowIso,
    });
    await adminDb.collection('payments').doc(tranId).set(
      {
        status: 'paid',
        transactionId: data.bank_tran_id || valId,
        valId,
        verifiedAt: nowIso,
      },
      { merge: true }
    );
    await createUserNotification(orderData.userId, {
      type: 'payment_confirmation',
      titleEn: `Payment Confirmed: ${tranId}`,
      titleBn: `পেমেন্ট সফল হয়েছে: ${tranId}`,
      bodyEn: `Your payment of ৳${orderData.grandTotal} has been verified.`,
      bodyBn: `আপনার ৳${orderData.grandTotal} টাকার পেমেন্ট সফলভাবে যাচাই হয়েছে।`,
      orderNumber: tranId,
    });
    await createAdminNotification({
      type: 'payment_received',
      titleEn: `Payment Verified: ${tranId}`,
      titleBn: `পেমেন্ট সম্পন্ন: ${tranId}`,
      bodyEn: `৳${orderData.grandTotal} received via SSLCommerz (Trx: ${data.bank_tran_id || valId}).`,
      bodyBn: `এসএসএলকমার্জ মাধ্যমে ৳${orderData.grandTotal} পেমেন্ট গৃহীত হয়েছে।`,
      recordId: orderDoc.id,
    });
    return { ok: true };
  }
  return { ok: false };
}

app.post('/api/payments/sslcommerz/success', async (req, res) => {
  const tranId = sanitizeText(req.body?.tran_id, 60);
  const valId = sanitizeText(req.body?.val_id, 120);
  const verified = tranId && valId ? await verifySslcommerzPayment(valId, tranId) : { ok: false };
  if (verified.ok) {
    res.redirect(`/order-confirmation/${encodeURIComponent(tranId)}?payment=verified`);
  } else {
    res.redirect(`/order-confirmation/${encodeURIComponent(tranId || 'unknown')}?payment=failed`);
  }
});

app.post('/api/payments/sslcommerz/ipn', async (req, res) => {
  const tranId = sanitizeText(req.body?.tran_id, 60);
  const valId = sanitizeText(req.body?.val_id, 120);
  if (tranId && valId) {
    await verifySslcommerzPayment(valId, tranId);
  }
  res.json({ received: true });
});

app.post('/api/payments/sslcommerz/fail', async (req, res) => {
  const tranId = sanitizeText(req.body?.tran_id, 60);
  if (tranId) {
    const snap = await adminDb.collection('orders').where('orderNumber', '==', tranId).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ paymentStatus: 'failed', updatedAt: new Date().toISOString() });
      await adminDb.collection('payments').doc(tranId).set({ status: 'failed', updatedAt: new Date().toISOString() }, { merge: true });
      await createAdminNotification({
        type: 'payment_failed',
        titleEn: `Payment Failed: ${tranId}`,
        titleBn: `পেমেন্ট ব্যর্থ: ${tranId}`,
        bodyEn: `SSLCommerz transaction failed for order ${tranId}.`,
        bodyBn: `অর্ডার ${tranId}-এর এসএসএলকমার্জ পেমেন্ট ব্যর্থ হয়েছে।`,
        recordId: snap.docs[0].id,
      });
    }
  }
  res.redirect(`/order-confirmation/${encodeURIComponent(tranId || 'unknown')}?payment=failed`);
});

app.post('/api/payments/sslcommerz/cancel', async (req, res) => {
  const tranId = sanitizeText(req.body?.tran_id, 60);
  res.redirect(`/order-confirmation/${encodeURIComponent(tranId || 'unknown')}?payment=cancelled`);
});

// bKash Server-Side Callback & Execute Verification
app.get('/api/payments/bkash/callback', async (req, res) => {
  const paymentID = sanitizeText(req.query?.paymentID, 120);
  const status = sanitizeText(req.query?.status, 40);
  const orderNumber = sanitizeText(req.query?.orderNumber, 60);

  if (status !== 'success' || !paymentID || !orderNumber) {
    res.redirect(`/order-confirmation/${encodeURIComponent(orderNumber || 'unknown')}?payment=failed`);
    return;
  }

  try {
    const creds = await getGatewayCredentials();
    const bkashBase = creds.bkash.sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    const tokenRes = await fetch(`${bkashBase}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: creds.bkash.username,
        password: creds.bkash.password,
      },
      body: JSON.stringify({ app_key: creds.bkash.appKey, app_secret: creds.bkash.appSecret }),
    });
    const tokenJson = (await tokenRes.json()) as any;
    const execRes = await fetch(`${bkashBase}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: tokenJson.id_token,
        'X-APP-Key': creds.bkash.appKey,
      },
      body: JSON.stringify({ paymentID }),
    });
    const execJson = (await execRes.json()) as any;
    if (execJson?.transactionStatus === 'Completed' && execJson?.trxID) {
      const orderSnap = await adminDb.collection('orders').where('orderNumber', '==', orderNumber).limit(1).get();
      if (!orderSnap.empty) {
        const orderDoc = orderSnap.docs[0];
        const orderData = orderDoc.data();
        const nowIso = new Date().toISOString();
        await orderDoc.ref.update({
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          transactionId: execJson.trxID,
          timeline: FieldValue.arrayUnion({
            status: 'confirmed',
            titleEn: 'bKash Payment Verified',
            titleBn: 'বিকাশ পেমেন্ট যাচাই সম্পন্ন',
            noteEn: `bKash TrxID: ${execJson.trxID}`,
            noteBn: `বিকাশ ট্রানজেকশন আইডি: ${execJson.trxID}`,
            timestamp: nowIso,
          }),
          updatedAt: nowIso,
        });
        await adminDb.collection('payments').doc(orderNumber).set(
          { status: 'paid', transactionId: execJson.trxID, verifiedAt: nowIso },
          { merge: true }
        );
        await createUserNotification(orderData.userId, {
          type: 'payment_confirmation',
          titleEn: `bKash Payment Confirmed: ${orderNumber}`,
          titleBn: `বিকাশ পেমেন্ট সফল: ${orderNumber}`,
          bodyEn: `Transaction ${execJson.trxID} verified for ৳${orderData.grandTotal}.`,
          bodyBn: `৳${orderData.grandTotal} টাকার বিকাশ পেমেন্ট (${execJson.trxID}) যাচাই হয়েছে।`,
          orderNumber,
        });
        await createAdminNotification({
          type: 'payment_received',
          titleEn: `bKash Payment Verified: ${orderNumber}`,
          titleBn: `বিকাশ পেমেন্ট সম্পন্ন: ${orderNumber}`,
          bodyEn: `৳${orderData.grandTotal} verified via bKash (Trx: ${execJson.trxID}).`,
          bodyBn: `বিকাশের মাধ্যমে ৳${orderData.grandTotal} পেমেন্ট গৃহীত হয়েছে (${execJson.trxID})।`,
          recordId: orderDoc.id,
        });
      }
      res.redirect(`/order-confirmation/${encodeURIComponent(orderNumber)}?payment=verified`);
      return;
    }
  } catch (err) {
    console.error('bKash callback error:', err);
  }
  await adminDb.collection('payments').doc(orderNumber).set({ status: 'failed', updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  await createAdminNotification({
    type: 'payment_failed',
    titleEn: `bKash Payment Failed: ${orderNumber}`,
    titleBn: `বিকাশ পেমেন্ট ব্যর্থ: ${orderNumber}`,
    bodyEn: `bKash execution failed for order ${orderNumber}.`,
    bodyBn: `অর্ডার ${orderNumber}-এর বিকাশ পেমেন্ট ব্যর্থ হয়েছে।`,
    recordId: orderNumber,
  });
  res.redirect(`/order-confirmation/${encodeURIComponent(orderNumber)}?payment=failed`);
});

// Secure Guest & Customer Order Tracking
app.post('/api/orders/track', rateLimit(30, 60_000), async (req, res) => {
  try {
    const orderNumber = sanitizeText(req.body?.orderNumber, 40).toUpperCase();
    const phone = normalizeBdPhone(sanitizeText(req.body?.phone, 30));
    const authedUser = await extractOptionalUser(req);

    if (!orderNumber) {
      res.status(400).json({ error: 'Order ID is required', errorBn: 'অর্ডার আইডি দিন' });
      return;
    }
    const snap = await adminDb.collection('orders').where('orderNumber', '==', orderNumber).limit(1).get();
    if (snap.empty) {
      res.status(404).json({ error: 'Order not found', errorBn: 'অর্ডারটি খুঁজে পাওয়া যায়নি' });
      return;
    }
    const order = snap.docs[0].data();
    const isOwner = authedUser && order.userId && order.userId === authedUser.uid;
    const phoneMatches = phone && normalizeBdPhone(order.customerPhone || '') === phone;

    if (!isOwner && !phoneMatches) {
      res.status(403).json({
        error: 'Phone number does not match this Order ID.',
        errorBn: 'এই অর্ডার আইডির সাথে মোবাইল নম্বর মেলেনি।',
      });
      return;
    }
    // Strip internal admin notes before returning
    const { internalNotes: _hidden, ...publicOrder } = order;
    res.json({ order: publicOrder });
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ error: 'Tracking lookup failed' });
  }
});

// Customer Cancel Own Pending Order
app.post('/api/orders/:orderId/cancel', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const orderId = sanitizeText(req.params.orderId, 128);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const order = snap.data()!;
    if (order.userId !== req.authUser!.uid) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      res.status(400).json({ error: 'Order cannot be cancelled after processing begins.' });
      return;
    }
    const nowIso = new Date().toISOString();
    await adminDb.runTransaction(async (tx) => {
      for (const item of order.items || []) {
        tx.update(adminDb.collection('products').doc(item.productId), {
          stock: FieldValue.increment(item.quantity),
        });
      }
      tx.update(ref, {
        orderStatus: 'cancelled',
        stockRestored: true,
        timeline: FieldValue.arrayUnion({
          status: 'cancelled',
          titleEn: 'Cancelled by Customer',
          titleBn: 'গ্রাহক কর্তৃক বাতিলকৃত',
          timestamp: nowIso,
        }),
        updatedAt: nowIso,
      });
    });
    await createAdminNotification({
      type: 'order_cancelled',
      titleEn: `Order Cancelled: ${order.orderNumber}`,
      titleBn: `অর্ডার বাতিল: ${order.orderNumber}`,
      bodyEn: `${order.customerName} cancelled order ${order.orderNumber}. Stock restored.`,
      bodyBn: `${order.customerName} অর্ডার ${order.orderNumber} বাতিল করেছেন। স্টক পুনরুদ্ধার হয়েছে।`,
      recordId: orderId,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Could not cancel order' });
  }
});

// Rate-Limited Password Reset Token Flow & Phone Verification
app.post('/api/auth/password-reset-request', rateLimit(5, 15 * 60_000), async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    let userRecord = null;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      // Return generic success to avoid email enumeration
      res.json({
        ok: true,
        messageEn: 'If an account exists for that email, a reset link has been prepared.',
        messageBn: 'উক্ত ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।',
      });
      return;
    }
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await adminDb.collection('reset_tokens').doc(tokenHash).set({
      uid: userRecord.uid,
      email,
      expiresAt: Date.now() + 15 * 60_000,
      used: false,
    });
    res.json({
      ok: true,
      messageEn: 'Secure reset token generated (valid for 15 minutes).',
      messageBn: 'নিরাপদ রিসেট টোকেন তৈরি হয়েছে (১৫ মিনিট মেয়াদ)।',
      resetToken: rawToken,
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
});

app.post('/api/auth/password-reset-confirm', rateLimit(10, 15 * 60_000), async (req, res) => {
  try {
    const token = sanitizeText(req.body?.token, 128);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!token || newPassword.length < 8) {
      res.status(400).json({
        error: 'Valid token and password (minimum 8 characters) are required.',
        errorBn: 'বৈধ টোকেন এবং কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।',
      });
      return;
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const ref = adminDb.collection('reset_tokens').doc(tokenHash);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(400).json({ error: 'Invalid or expired reset link.', errorBn: 'রিসেট লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।' });
      return;
    }
    const data = snap.data()!;
    if (data.used || Date.now() > Number(data.expiresAt)) {
      res.status(400).json({ error: 'Reset link has expired.', errorBn: 'রিসেট লিংকের মেয়াদ শেষ হয়ে গেছে।' });
      return;
    }
    await adminAuth.updateUser(data.uid, { password: newPassword });
    await ref.update({ used: true });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset confirm error:', err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

app.post('/api/auth/phone-otp-request', requireAuth, rateLimit(5, 10 * 60_000), async (req: AuthedRequest, res) => {
  try {
    const phone = normalizeBdPhone(sanitizeText(req.body?.phone, 30));
    if (!isValidBdPhone(phone)) {
      res.status(400).json({ error: 'Valid Bangladesh mobile number required', errorBn: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন' });
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await adminDb.collection('phone_otps').doc(req.authUser!.uid).set({
      phone,
      codeHash: crypto.createHash('sha256').update(code).digest('hex'),
      expiresAt: Date.now() + 5 * 60_000,
    });
    // In production, integrate SMS_API_KEY gateway here
    res.json({
      ok: true,
      smsDispatched: Boolean(process.env.SMS_API_KEY),
      verificationCodePreview: process.env.SMS_API_KEY ? undefined : code,
    });
  } catch (err) {
    console.error('Phone OTP error:', err);
    res.status(500).json({ error: 'Could not generate OTP' });
  }
});

app.post('/api/auth/phone-otp-verify', requireAuth, rateLimit(10, 10 * 60_000), async (req: AuthedRequest, res) => {
  try {
    const code = sanitizeText(req.body?.code, 10);
    const ref = adminDb.collection('phone_otps').doc(req.authUser!.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(400).json({ error: 'No verification pending' });
      return;
    }
    const data = snap.data()!;
    if (Date.now() > Number(data.expiresAt)) {
      res.status(400).json({ error: 'Verification code expired', errorBn: 'কোডের মেয়াদ শেষ হয়েছে' });
      return;
    }
    const incomingHash = crypto.createHash('sha256').update(code).digest('hex');
    if (incomingHash !== data.codeHash) {
      res.status(400).json({ error: 'Incorrect verification code', errorBn: 'ভুল ভেরিফিকেশন কোড' });
      return;
    }
    await adminDb.collection('users').doc(req.authUser!.uid).set(
      { phone: data.phone, phoneVerified: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    await ref.delete();
    res.json({ ok: true, phone: data.phone });
  } catch (err) {
    console.error('Phone verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Customer registration onboarding alert
app.post('/api/customers/sync-notify', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const uid = req.authUser!.uid;
    const fullName = sanitizeText(req.body?.fullName, 120) || req.authUser!.name || 'New Customer';
    const existing = await adminDb.collection('admin_notifications').where('recordId', '==', uid).limit(1).get();
    if (existing.empty) {
      await createAdminNotification({
        type: 'new_customer',
        titleEn: `New Customer Joined: ${fullName}`,
        titleBn: `নতুন গ্রাহক নিবন্ধিত: ${fullName}`,
        bodyEn: `${fullName} (${req.authUser!.email}) registered an ASVORE account.`,
        bodyBn: `${fullName} (${req.authUser!.email}) একটি ASVORE অ্যাকাউন্ট খুলেছেন।`,
        recordId: uid,
      });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// Check Current User Admin Role
app.get('/api/auth/me-role', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.authUser!;
  if (user.email === BOOTSTRAP_SUPER_ADMIN_EMAIL && user.emailVerified) {
    res.json({ isAdmin: true, role: 'super_admin' });
    return;
  }
  const snap = await adminDb.collection('admins').doc(user.uid).get();
  if (snap.exists && snap.data()?.active) {
    res.json({ isAdmin: true, role: snap.data()?.role || 'admin' });
    return;
  }
  res.json({ isAdmin: false, role: 'customer' });
});

// ADMIN ROUTES & AUDIT LOGGING
app.post('/api/admin/audit-login', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (req: AuthedRequest, res) => {
  await writeAuditLog(req, 'ADMIN_LOGIN', `Admin signed in (${req.adminRole})`, req.authUser!.uid);
  res.json({ ok: true, role: req.adminRole });
});

app.post('/api/admin/audit-logout', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (req: AuthedRequest, res) => {
  await writeAuditLog(req, 'ADMIN_LOGOUT', `Admin signed out (${req.adminRole})`, req.authUser!.uid);
  res.json({ ok: true });
});

app.get('/api/admin/audit-logs', requireAdmin(['super_admin', 'admin']), async (_req, res) => {
  try {
    const snap = await adminDb.collection('audit_logs').limit(250).get();
    const logs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    res.json({ logs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.get('/api/admin/notifications', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (_req, res) => {
  try {
    const snap = await adminDb.collection('admin_notifications').limit(100).get();
    const notifications = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    res.json({ notifications });
  } catch (err) {
    console.error('Admin notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/admin/notifications/:id/read', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (req, res) => {
  const id = sanitizeText(req.params.id, 128);
  await adminDb.collection('admin_notifications').doc(id).update({ read: true }).catch(() => {});
  res.json({ ok: true });
});

app.post('/api/admin/notifications/read-all', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (_req, res) => {
  const snap = await adminDb.collection('admin_notifications').where('read', '==', false).get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
  res.json({ ok: true });
});

app.get('/api/admin/overview', requireAdmin(['super_admin', 'admin', 'order_manager', 'product_manager']), async (req, res) => {
  try {
    const range = sanitizeText(req.query?.range, 30) || '30d';
    const startParam = sanitizeText(req.query?.start, 30);
    const endParam = sanitizeText(req.query?.end, 30);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let fromMs = 0;
    let toMs = now.getTime() + 86_400_000;
    if (range === 'today') {
      fromMs = todayStart;
    } else if (range === 'yesterday') {
      fromMs = todayStart - 86_400_000;
      toMs = todayStart - 1;
    } else if (range === '7d') {
      fromMs = now.getTime() - 7 * 86_400_000;
    } else if (range === '30d') {
      fromMs = now.getTime() - 30 * 86_400_000;
    } else if (range === 'month') {
      fromMs = monthStart;
    } else if (range === 'last_month') {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      fromMs = lmStart.getTime();
      toMs = lmEnd.getTime();
    } else if (range === 'custom' && startParam) {
      fromMs = new Date(startParam).getTime();
      if (endParam) toMs = new Date(endParam).getTime() + 86_400_000;
    }

    const [ordersSnap, usersSnap, productsSnap, paymentsSnap] = await Promise.all([
      adminDb.collection('orders').get(),
      adminDb.collection('users').get(),
      adminDb.collection('products').get(),
      adminDb.collection('payments').get(),
    ]);

    const allOrders = ordersSnap.docs.map((d) => d.data());
    const filteredOrders = allOrders.filter((o) => {
      const ts = new Date(o.createdAt || 0).getTime();
      return ts >= fromMs && ts <= toMs;
    });

    const isRevenueOrder = (o: any) =>
      o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned' && o.paymentStatus !== 'refunded';

    const totalRevenue = filteredOrders.filter(isRevenueOrder).reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const todaysRevenue = allOrders
      .filter((o) => isRevenueOrder(o) && new Date(o.createdAt || 0).getTime() >= todayStart)
      .reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const monthlyRevenue = allOrders
      .filter((o) => isRevenueOrder(o) && new Date(o.createdAt || 0).getTime() >= monthStart)
      .reduce((s, o) => s + Number(o.grandTotal || 0), 0);

    const pendingOrders = filteredOrders.filter((o) => o.orderStatus === 'pending').length;
    const confirmedOrders = filteredOrders.filter((o) => o.orderStatus === 'confirmed').length;
    const processingOrders = filteredOrders.filter((o) => o.orderStatus === 'processing').length;
    const shippedOrders = filteredOrders.filter((o) => o.orderStatus === 'shipped' || o.orderStatus === 'out_for_delivery').length;
    const deliveredOrders = filteredOrders.filter((o) => o.orderStatus === 'delivered').length;
    const cancelledOrders = filteredOrders.filter((o) => o.orderStatus === 'cancelled' || o.orderStatus === 'returned').length;

    const allUsers = usersSnap.docs.map((d) => d.data());
    const newCustomers = allUsers.filter((u) => {
      const ts = new Date(u.createdAt || 0).getTime();
      return ts >= fromMs && ts <= toMs;
    }).length;

    const products = productsSnap.docs.map((d) => d.data());
    const activeProducts = products.filter((p) => p.published !== false).length;
    const outOfStockProducts = products.filter((p) => Number(p.stock || 0) <= 0).length;
    const lowStockProducts = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.lowStockThreshold || 5));

    const bestSellingProducts = [...products]
      .sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))
      .slice(0, 6)
      .map((p) => {
        const unitPrice = Number(p.discountPrice ?? p.regularPrice ?? 0);
        const sold = Number(p.soldCount || 0);
        return {
          ...p,
          revenueGenerated: sold * unitPrice,
        };
      });

    const recentOrders = [...allOrders]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 8);

    const recentCustomers = [...allUsers]
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 6);

    const latestTransactions = paymentsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 8);

    // 1. Daily Sales (last 14 days)
    const dailyMap = new Map<string, { label: string; revenue: number; orders: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { label: `${d.getMonth() + 1}/${d.getDate()}`, revenue: 0, orders: 0 });
    }
    for (const o of allOrders) {
      if (!isRevenueOrder(o)) continue;
      const key = String(o.createdAt || '').slice(0, 10);
      const e = dailyMap.get(key);
      if (e) {
        e.revenue += Number(o.grandTotal || 0);
        e.orders += 1;
      }
    }

    // 2. Weekly Sales (last 8 weeks)
    const weeklySales: { label: string; revenue: number; orders: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const wEnd = todayStart - w * 7 * 86_400_000 + 86_400_000;
      const wStart = wEnd - 7 * 86_400_000;
      const sliceOrders = allOrders.filter((o) => {
        const ts = new Date(o.createdAt || 0).getTime();
        return isRevenueOrder(o) && ts >= wStart && ts < wEnd;
      });
      weeklySales.push({
        label: w === 0 ? 'This Wk' : `W-${w}`,
        revenue: sliceOrders.reduce((s, o) => s + Number(o.grandTotal || 0), 0),
        orders: sliceOrders.length,
      });
    }

    // 3. Monthly Sales & Customer Growth (last 6 months)
    const monthlyMap = new Map<string, { label: string; revenue: number; orders: number; customers: number }>();
    const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const baselineKey = `${sixMonthsStart.getFullYear()}-${String(sixMonthsStart.getMonth() + 1).padStart(2, '0')}`;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      monthlyMap.set(key, { label, revenue: 0, orders: 0, customers: 0 });
    }
    for (const o of allOrders) {
      if (!isRevenueOrder(o)) continue;
      const key = String(o.createdAt || '').slice(0, 7);
      const e = monthlyMap.get(key);
      if (e) {
        e.revenue += Number(o.grandTotal || 0);
        e.orders += 1;
      }
    }
    let priorCustomers = 0;
    for (const u of allUsers) {
      const key = String(u.createdAt || '').slice(0, 7);
      const e = monthlyMap.get(key);
      if (e) {
        e.customers += 1;
      } else if (!key || key < baselineKey) {
        priorCustomers += 1;
      }
    }
    let runningCustomers = priorCustomers;
    const customerGrowth = Array.from(monthlyMap.values()).map((m) => {
      runningCustomers += m.customers;
      return {
        label: m.label,
        value: m.customers,
        cumulative: runningCustomers,
      };
    });

    // 4. Yearly Revenue (last 4 years)
    const yearlyMap = new Map<string, { label: string; revenue: number; orders: number }>();
    for (let y = 3; y >= 0; y--) {
      const yr = String(now.getFullYear() - y);
      yearlyMap.set(yr, { label: yr, revenue: 0, orders: 0 });
    }
    for (const o of allOrders) {
      if (!isRevenueOrder(o)) continue;
      const yr = String(o.createdAt || '').slice(0, 4);
      const e = yearlyMap.get(yr);
      if (e) {
        e.revenue += Number(o.grandTotal || 0);
        e.orders += 1;
      }
    }

    const orderBreakdown = [
      { key: 'pending', count: pendingOrders },
      { key: 'confirmed', count: confirmedOrders },
      { key: 'processing', count: processingOrders },
      { key: 'shipped', count: shippedOrders },
      { key: 'delivered', count: deliveredOrders },
      { key: 'cancelled', count: cancelledOrders },
    ];

    res.json({
      stats: {
        totalRevenue,
        todaysRevenue,
        monthlyRevenue,
        totalOrders: filteredOrders.length,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers: usersSnap.size,
        newCustomers,
        totalProducts: productsSnap.size,
        activeProducts,
        outOfStockProducts,
        lowStockProducts: lowStockProducts.length,
      },
      lowStockList: lowStockProducts,
      bestSellingProducts,
      recentOrders,
      recentCustomers,
      latestTransactions,
      charts: {
        dailySales: Array.from(dailyMap.values()),
        weeklySales,
        monthlySales: Array.from(monthlyMap.values()),
        yearlySales: Array.from(yearlyMap.values()),
        customerGrowth,
        orderBreakdown,
      },
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

app.get('/api/admin/orders', requireAdmin(['super_admin', 'admin', 'order_manager']), async (_req, res) => {
  try {
    const snap = await adminDb.collection('orders').get();
    const orders = snap.docs
      .map((d) => d.data())
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ orders });
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

app.get('/api/admin/orders/export-csv', requireAdmin(['super_admin', 'admin', 'order_manager']), async (req: AuthedRequest, res) => {
  try {
    const statusFilter = sanitizeText(req.query?.status, 40) || 'all';
    const snap = await adminDb.collection('orders').get();
    let orders = snap.docs.map((d) => d.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (statusFilter !== 'all') {
      orders = orders.filter((o) => o.orderStatus === statusFilter);
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'OrderNumber',
      'Date',
      'CustomerName',
      'Phone',
      'Email',
      'District',
      'Upazila',
      'Address',
      'Items',
      'Subtotal',
      'Discount',
      'DeliveryCharge',
      'GrandTotal',
      'PaymentMethod',
      'PaymentStatus',
      'OrderStatus',
      'Courier',
      'TrackingCode',
    ].join(',');
    const rows = orders.map((o) =>
      [
        esc(o.orderNumber),
        esc(o.createdAt),
        esc(o.customerName),
        esc(o.customerPhone),
        esc(o.customerEmail),
        esc(o.shippingAddress?.district),
        esc(o.shippingAddress?.upazila),
        esc(o.shippingAddress?.streetAddress),
        esc((o.items || []).map((i: any) => `${i.nameEn} x${i.quantity}`).join('; ')),
        esc(o.subtotal),
        esc(o.discount),
        esc(o.deliveryCharge),
        esc(o.grandTotal),
        esc(o.paymentMethod),
        esc(o.paymentStatus),
        esc(o.orderStatus),
        esc(o.courierName),
        esc(o.trackingCode),
      ].join(',')
    );
    await writeAuditLog(req, 'ORDERS_EXPORT_CSV', `Exported ${orders.length} orders to CSV (filter: ${statusFilter})`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="asvore-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

app.post('/api/admin/orders/:orderId/update', requireAdmin(['super_admin', 'admin', 'order_manager']), async (req: AuthedRequest, res) => {
  try {
    const orderId = sanitizeText(req.params.orderId, 128);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const existing = snap.data()!;
    const body = req.body || {};
    const nextStatus = sanitizeText(body.orderStatus, 40) || existing.orderStatus;
    const nextPaymentStatus = sanitizeText(body.paymentStatus, 40) || existing.paymentStatus;
    const courierName = body.courierName !== undefined ? sanitizeText(body.courierName, 80) : existing.courierName;
    const trackingCode = body.trackingCode !== undefined ? sanitizeText(body.trackingCode, 80) : existing.trackingCode;
    const internalNotes = body.internalNotes !== undefined ? sanitizeText(body.internalNotes, 500) : existing.internalNotes;
    const transactionId = body.transactionId !== undefined ? sanitizeText(body.transactionId, 120) : existing.transactionId;
    const manualReconciliationNote = sanitizeText(body.manualReconciliationNote, 300);
    const nowIso = new Date().toISOString();

    // Never allow marking an online payment as "paid" without a valid Transaction ID + reconciliation note
    const isOnlineGateway = existing.paymentMethod && existing.paymentMethod !== 'cod';
    if (
      isOnlineGateway &&
      nextPaymentStatus === 'paid' &&
      existing.paymentStatus !== 'paid' &&
      (!transactionId || !manualReconciliationNote)
    ) {
      res.status(400).json({
        error: 'Marking an online gateway order as Paid requires both a verified Transaction ID and a manual reconciliation note.',
        errorBn: 'অনলাইন পেমেন্ট Paid হিসেবে চিহ্নিত করতে ট্রানজেকশন আইডি এবং রিকনসিলিয়েশন নোট উভয়ই প্রয়োজন।',
      });
      return;
    }

    const statusTitles: Record<string, { en: string; bn: string }> = {
      pending: { en: 'Order Placed', bn: 'অর্ডার প্লেসড' },
      confirmed: { en: 'Order Confirmed', bn: 'অর্ডার কনফার্মড' },
      processing: { en: 'Processing at Studio', bn: 'প্যাকেজিং চলছে' },
      shipped: { en: 'Shipped via Courier', bn: 'কুরিয়ারে পাঠানো হয়েছে' },
      out_for_delivery: { en: 'Out for Delivery', bn: 'ডেলিভারির পথে' },
      delivered: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
      cancelled: { en: 'Order Cancelled', bn: 'অর্ডার বাতিল' },
      returned: { en: 'Order Returned', bn: 'অর্ডার রিটার্ন হয়েছে' },
    };

    const updates: Record<string, any> = {
      orderStatus: nextStatus,
      paymentStatus: nextPaymentStatus,
      courierName,
      trackingCode,
      internalNotes,
      transactionId: transactionId || null,
      updatedAt: nowIso,
    };

    // Optional full order details editing (customer info, shipping address, charges, items)
    if (body.customerName !== undefined) updates.customerName = sanitizeText(body.customerName, 120) || existing.customerName;
    if (body.customerPhone !== undefined) updates.customerPhone = normalizeBdPhone(sanitizeText(body.customerPhone, 30)) || existing.customerPhone;
    if (body.customerEmail !== undefined) updates.customerEmail = sanitizeText(body.customerEmail, 160);
    if (body.orderNotes !== undefined) updates.orderNotes = sanitizeText(body.orderNotes, 400);
    if (body.shippingAddress && typeof body.shippingAddress === 'object') {
      updates.shippingAddress = {
        district: sanitizeText(body.shippingAddress.district, 80) || existing.shippingAddress?.district || 'Gaibandha',
        upazila: sanitizeText(body.shippingAddress.upazila, 80) || existing.shippingAddress?.upazila || '',
        deliveryArea: sanitizeText(body.shippingAddress.deliveryArea, 120) || '',
        streetAddress: sanitizeText(body.shippingAddress.streetAddress, 300) || existing.shippingAddress?.streetAddress || '',
        deliveryZone:
          sanitizeText(body.shippingAddress.district, 80).toLowerCase() === 'gaibandha'
            ? 'inside_gaibandha'
            : 'outside_gaibandha',
      };
    }

    const nextItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : existing.items;
    const nextSubtotal = Array.isArray(body.items)
      ? nextItems.reduce((sum: number, it: any) => sum + Number(it.unitPrice || 0) * Math.max(1, Number(it.quantity || 1)), 0)
      : Number(existing.subtotal || 0);
    const nextDiscount = body.discount !== undefined ? Math.max(0, Number(body.discount)) : Number(existing.discount || 0);
    const nextDelivery = body.deliveryCharge !== undefined ? Math.max(0, Number(body.deliveryCharge)) : Number(existing.deliveryCharge || 0);
    const nextTax = Number(existing.taxAmount || 0);

    if (Array.isArray(body.items) || body.discount !== undefined || body.deliveryCharge !== undefined) {
      updates.items = nextItems;
      updates.subtotal = nextSubtotal;
      updates.discount = nextDiscount;
      updates.deliveryCharge = nextDelivery;
      updates.grandTotal = Math.max(0, nextSubtotal - nextDiscount + nextDelivery + nextTax);
    }

    const timelineEntries: any[] = [];
    if (nextStatus !== existing.orderStatus) {
      const label = statusTitles[nextStatus] || { en: nextStatus, bn: nextStatus };
      timelineEntries.push({
        status: nextStatus,
        titleEn: label.en,
        titleBn: label.bn,
        noteEn: trackingCode ? `Courier: ${courierName || 'Partner'} · Tracking: ${trackingCode}` : '',
        noteBn: trackingCode ? `কুরিয়ার: ${courierName || 'পার্টনার'} · ট্র্যাকিং: ${trackingCode}` : '',
        actorEmail: req.authUser!.email,
        timestamp: nowIso,
      });

      await createUserNotification(existing.userId, {
        type: nextStatus === 'delivered' ? 'delivery' : nextStatus === 'shipped' ? 'shipping' : 'order_status',
        titleEn: `Order ${existing.orderNumber}: ${label.en}`,
        titleBn: `অর্ডার ${existing.orderNumber}: ${label.bn}`,
        bodyEn: trackingCode
          ? `Your order status is now ${label.en}. Tracking: ${trackingCode}`
          : `Your order status has been updated to ${label.en}.`,
        bodyBn: trackingCode
          ? `আপনার অর্ডারের বর্তমান অবস্থা: ${label.bn}। ট্র্যাকিং কোড: ${trackingCode}`
          : `আপনার অর্ডারের অবস্থা আপডেট হয়ে "${label.bn}" হয়েছে।`,
        orderNumber: existing.orderNumber,
      });
    }

    if (manualReconciliationNote && nextPaymentStatus !== existing.paymentStatus) {
      timelineEntries.push({
        status: nextStatus,
        titleEn: `Payment Updated: ${nextPaymentStatus}`,
        titleBn: `পেমেন্ট আপডেট: ${nextPaymentStatus}`,
        noteEn: `${manualReconciliationNote} (Trx: ${transactionId || 'N/A'})`,
        noteBn: `${manualReconciliationNote} (Trx: ${transactionId || 'N/A'})`,
        actorEmail: req.authUser!.email,
        timestamp: nowIso,
      });
      await adminDb.collection('payments').doc(existing.orderNumber).set(
        {
          id: existing.orderNumber,
          orderId,
          orderNumber: existing.orderNumber,
          gateway: existing.paymentMethod,
          amount: updates.grandTotal ?? existing.grandTotal,
          status: nextPaymentStatus,
          transactionId: transactionId || null,
          reconciledBy: req.authUser!.email,
          reconciliationNote: manualReconciliationNote,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    if (timelineEntries.length > 0) {
      updates.timeline = FieldValue.arrayUnion(...timelineEntries);
    }

    // Automatic stock restoration if order moves into cancelled or returned (and not already restored)
    const shouldRestoreStock =
      ['cancelled', 'returned'].includes(nextStatus) &&
      !['cancelled', 'returned'].includes(existing.orderStatus) &&
      !existing.stockRestored;

    if (shouldRestoreStock) {
      await adminDb.runTransaction(async (tx) => {
        for (const item of existing.items || []) {
          const pRef = adminDb.collection('products').doc(item.productId);
          tx.update(pRef, {
            stock: FieldValue.increment(Number(item.quantity || 1)),
            updatedAt: nowIso,
          });
        }
        tx.update(ref, { ...updates, stockRestored: true });
      });
    } else {
      await ref.update(updates);
    }

    await writeAuditLog(
      req,
      'ORDER_UPDATED',
      `Updated order ${existing.orderNumber}: status ${existing.orderStatus}->${nextStatus}, payment ${existing.paymentStatus}->${nextPaymentStatus}`,
      orderId
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin order update error:', err);
    res.status(500).json({ error: 'Order update failed' });
  }
});

app.delete('/api/admin/orders/:orderId', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const orderId = sanitizeText(req.params.orderId, 128);
    const ref = adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const order = snap.data()!;
    if (order.orderStatus !== 'cancelled' && order.paymentStatus !== 'failed') {
      res.status(400).json({
        error: 'Only cancelled or payment-failed orders can be permanently deleted.',
        errorBn: 'শুধুমাত্র বাতিলকৃত বা পেমেন্ট ব্যর্থ অর্ডার স্থায়ীভাবে মুছে ফেলা যাবে।',
      });
      return;
    }
    await ref.delete();
    await writeAuditLog(req, 'ORDER_DELETED', `Deleted cancelled/failed order ${order.orderNumber}`, orderId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

app.get('/api/admin/customers', requireAdmin(['super_admin', 'admin', 'order_manager']), async (_req, res) => {
  try {
    const [usersSnap, ordersSnap] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('orders').get(),
    ]);
    const orders = ordersSnap.docs.map((d) => d.data());
    const customers = usersSnap.docs.map((d) => {
      const u = d.data();
      const userOrders = orders.filter((o) => o.userId === u.uid);
      const totalSpent = userOrders
        .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned')
        .reduce((s, o) => s + Number(o.grandTotal || 0), 0);
      return { ...u, orderCount: userOrders.length, totalSpent };
    });
    res.json({ customers });
  } catch (err) {
    console.error('Admin customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

app.get('/api/admin/customers/:uid/details', requireAdmin(['super_admin', 'admin', 'order_manager']), async (req, res) => {
  try {
    const uid = sanitizeText(req.params.uid, 128);
    const [userSnap, addrSnap, ordersSnap] = await Promise.all([
      adminDb.collection('users').doc(uid).get(),
      adminDb.collection('users').doc(uid).collection('addresses').get(),
      adminDb.collection('orders').where('userId', '==', uid).get(),
    ]);
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const orders = ordersSnap.docs
      .map((d) => d.data())
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned')
      .reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    res.json({
      customer: userSnap.data(),
      addresses: addrSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      orders,
      totalSpent,
    });
  } catch (err) {
    console.error('Customer details error:', err);
    res.status(500).json({ error: 'Failed to load customer details' });
  }
});

app.post('/api/admin/customers/:uid/update', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const uid = sanitizeText(req.params.uid, 128);
    const isActive = req.body?.isActive;
    const fullName = req.body?.fullName !== undefined ? sanitizeText(req.body.fullName, 120) : undefined;
    const phone = req.body?.phone !== undefined ? sanitizeText(req.body.phone, 30) : undefined;
    const email = req.body?.email !== undefined ? sanitizeText(req.body.email, 160) : undefined;

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
      await adminAuth.updateUser(uid, { disabled: !isActive }).catch(() => {});
    }
    if (fullName) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (email) updates.email = email;

    await adminDb.collection('users').doc(uid).set(updates, { merge: true });

    // Address CRUD for admin
    if (req.body?.addressAction === 'upsert' && req.body?.address) {
      const a = req.body.address;
      const addrId = sanitizeText(a.id, 128) || adminDb.collection('users').doc(uid).collection('addresses').doc().id;
      await adminDb
        .collection('users')
        .doc(uid)
        .collection('addresses')
        .doc(addrId)
        .set({
          id: addrId,
          label: sanitizeText(a.label, 60) || 'Saved Address',
          fullName: sanitizeText(a.fullName, 120),
          phone: sanitizeText(a.phone, 30),
          district: sanitizeText(a.district, 80),
          upazila: sanitizeText(a.upazila, 80),
          deliveryArea: sanitizeText(a.deliveryArea, 120),
          streetAddress: sanitizeText(a.streetAddress, 300),
          isDefault: Boolean(a.isDefault),
        });
    } else if (req.body?.addressAction === 'delete' && req.body?.addressId) {
      await adminDb.collection('users').doc(uid).collection('addresses').doc(sanitizeText(req.body.addressId, 128)).delete();
    }

    await writeAuditLog(req, 'CUSTOMER_UPDATED', `Updated customer profile/status (${uid})`, uid);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin customer update error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Server-Backed Product Management (with Stock History & Audit Logs)
app.get('/api/admin/products', requireAdmin(['super_admin', 'admin', 'product_manager', 'order_manager']), async (_req, res) => {
  try {
    const snap = await adminDb.collection('products').get();
    const products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    res.json({ products });
  } catch (err) {
    console.error('Admin products list error:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/admin/products', requireAdmin(['super_admin', 'admin', 'product_manager']), async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    const nameEn = sanitizeText(b.nameEn, 200);
    const nameBn = sanitizeText(b.nameBn, 200);
    const sku = sanitizeText(b.sku, 80);
    if (!nameEn || !nameBn || !sku) {
      res.status(400).json({ error: 'Name (EN/BN) and SKU are required.' });
      return;
    }
    const id = sanitizeText(b.id, 128) || `prod-${Date.now()}`;
    const slug =
      sanitizeText(b.slug, 180) ||
      nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const nowIso = new Date().toISOString();
    const stock = Math.max(0, Number(b.stock || 0));
    const lowStockThreshold = Math.max(0, Number(b.lowStockThreshold || 5));

    const payload = {
      id,
      slug,
      sku,
      nameEn,
      nameBn,
      descriptionEn: sanitizeText(b.descriptionEn, 3000),
      descriptionBn: sanitizeText(b.descriptionBn, 3000),
      categoryId: sanitizeText(b.categoryId, 80) || 'mens-clothing',
      subcategoryId: sanitizeText(b.subcategoryId, 80) || '',
      brand: sanitizeText(b.brand, 100) || 'ASVORE',
      regularPrice: Math.max(0, Number(b.regularPrice || 0)),
      discountPrice: b.discountPrice ? Math.max(0, Number(b.discountPrice)) : null,
      images: Array.isArray(b.images) ? b.images.slice(0, 12) : [],
      sizes: Array.isArray(b.sizes) ? b.sizes.slice(0, 20) : [],
      colors: Array.isArray(b.colors) ? b.colors : [],
      specifications: Array.isArray(b.specifications) ? b.specifications : [],
      weight: sanitizeText(b.weight, 60),
      tags: Array.isArray(b.tags) ? b.tags.map((t: unknown) => sanitizeText(t, 40)).filter(Boolean) : [],
      seoTitle: sanitizeText(b.seoTitle, 180),
      seoDescription: sanitizeText(b.seoDescription, 400),
      stock,
      lowStockThreshold,
      stockHistory: [
        {
          delta: stock,
          previousStock: 0,
          newStock: stock,
          reason: 'Initial catalog stock',
          actorEmail: req.authUser!.email,
          timestamp: nowIso,
        },
      ],
      featured: Boolean(b.featured),
      bestSeller: Boolean(b.bestSeller),
      trending: Boolean(b.trending),
      newArrival: Boolean(b.newArrival),
      published: b.published !== false,
      ratingAvg: Number(b.ratingAvg || 5),
      ratingCount: Number(b.ratingCount || 0),
      soldCount: Number(b.soldCount || 0),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await adminDb.collection('products').doc(id).set(payload);
    await writeAuditLog(req, 'PRODUCT_CREATED', `Created product ${nameEn} (${sku})`, id);
    res.json({ ok: true, product: payload });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireAdmin(['super_admin', 'admin', 'product_manager']), async (req: AuthedRequest, res) => {
  try {
    const id = sanitizeText(req.params.id, 128);
    const ref = adminDb.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const existing = snap.data()!;
    const b = req.body || {};
    const nowIso = new Date().toISOString();
    const prevStock = Number(existing.stock || 0);
    const nextStock = b.stock !== undefined ? Math.max(0, Number(b.stock)) : prevStock;
    const stockHistory = Array.isArray(existing.stockHistory) ? [...existing.stockHistory] : [];
    if (nextStock !== prevStock) {
      stockHistory.unshift({
        delta: nextStock - prevStock,
        previousStock: prevStock,
        newStock: nextStock,
        reason: sanitizeText(b.stockChangeReason, 160) || 'Admin stock adjustment',
        actorEmail: req.authUser!.email,
        timestamp: nowIso,
      });
    }

    const updated = {
      ...existing,
      slug: sanitizeText(b.slug, 180) || existing.slug,
      sku: sanitizeText(b.sku, 80) || existing.sku,
      nameEn: sanitizeText(b.nameEn, 200) || existing.nameEn,
      nameBn: sanitizeText(b.nameBn, 200) || existing.nameBn,
      descriptionEn: b.descriptionEn !== undefined ? sanitizeText(b.descriptionEn, 3000) : existing.descriptionEn,
      descriptionBn: b.descriptionBn !== undefined ? sanitizeText(b.descriptionBn, 3000) : existing.descriptionBn,
      categoryId: sanitizeText(b.categoryId, 80) || existing.categoryId,
      subcategoryId: b.subcategoryId !== undefined ? sanitizeText(b.subcategoryId, 80) : existing.subcategoryId || '',
      brand: sanitizeText(b.brand, 100) || existing.brand,
      regularPrice: b.regularPrice !== undefined ? Math.max(0, Number(b.regularPrice)) : existing.regularPrice,
      discountPrice: b.discountPrice === null ? null : b.discountPrice !== undefined ? Math.max(0, Number(b.discountPrice)) : existing.discountPrice,
      images: Array.isArray(b.images) ? b.images.slice(0, 12) : existing.images,
      sizes: Array.isArray(b.sizes) ? b.sizes.slice(0, 20) : existing.sizes,
      colors: Array.isArray(b.colors) ? b.colors : existing.colors,
      specifications: Array.isArray(b.specifications) ? b.specifications : existing.specifications,
      weight: b.weight !== undefined ? sanitizeText(b.weight, 60) : existing.weight || '',
      tags: Array.isArray(b.tags) ? b.tags.map((t: unknown) => sanitizeText(t, 40)).filter(Boolean) : existing.tags || [],
      seoTitle: b.seoTitle !== undefined ? sanitizeText(b.seoTitle, 180) : existing.seoTitle || '',
      seoDescription: b.seoDescription !== undefined ? sanitizeText(b.seoDescription, 400) : existing.seoDescription || '',
      stock: nextStock,
      lowStockThreshold: b.lowStockThreshold !== undefined ? Math.max(0, Number(b.lowStockThreshold)) : existing.lowStockThreshold,
      stockHistory: stockHistory.slice(0, 50),
      featured: b.featured !== undefined ? Boolean(b.featured) : existing.featured,
      bestSeller: b.bestSeller !== undefined ? Boolean(b.bestSeller) : existing.bestSeller,
      trending: b.trending !== undefined ? Boolean(b.trending) : existing.trending,
      newArrival: b.newArrival !== undefined ? Boolean(b.newArrival) : existing.newArrival,
      published: b.published !== undefined ? Boolean(b.published) : existing.published,
      updatedAt: nowIso,
    };

    await ref.set(updated);
    if (nextStock <= Number(updated.lowStockThreshold || 5)) {
      await createAdminNotification({
        type: 'low_stock',
        titleEn: `Low Stock Alert: ${updated.nameEn}`,
        titleBn: `সীমিত স্টক সতর্কতা: ${updated.nameBn}`,
        bodyEn: `SKU ${updated.sku} now has ${nextStock} unit(s) left.`,
        bodyBn: `SKU ${updated.sku}-এ মাত্র ${nextStock}টি পণ্য বাকি।`,
        recordId: id,
      });
    }
    await writeAuditLog(req, 'PRODUCT_UPDATED', `Updated product ${updated.nameEn} (${updated.sku})`, id);
    res.json({ ok: true, product: updated });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin(['super_admin', 'admin', 'product_manager']), async (req: AuthedRequest, res) => {
  try {
    const id = sanitizeText(req.params.id, 128);
    const ref = adminDb.collection('products').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const p = snap.data()!;
    await ref.delete();
    await writeAuditLog(req, 'PRODUCT_DELETED', `Deleted product ${p.nameEn} (${p.sku})`, id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.get('/api/admin/gateways', requireAdmin(['super_admin', 'admin']), async (_req, res) => {
  try {
    const [pubSnap, privSnap, paymentsSnap] = await Promise.all([
      adminDb.collection('settings').doc('payment_gateways_public').get(),
      adminDb.collection('settings_private').doc('payment_gateways').get(),
      adminDb.collection('payments').get(),
    ]);
    const pub = pubSnap.exists ? pubSnap.data() : SEED_GATEWAY_FLAGS;
    const priv = privSnap.exists ? privSnap.data() || {} : {};
    res.json({
      publicFlags: pub,
      configured: {
        sslcommerz: Boolean((priv.sslcommerzStoreId || process.env.SSLCOMMERZ_STORE_ID) && (priv.sslcommerzStorePasswd || process.env.SSLCOMMERZ_STORE_PASSWD)),
        sslcommerzSandbox: priv.sslcommerzSandbox !== undefined ? Boolean(priv.sslcommerzSandbox) : true,
        bkash: Boolean((priv.bkashAppKey || process.env.BKASH_APP_KEY) && (priv.bkashAppSecret || process.env.BKASH_APP_SECRET)),
        bkashSandbox: priv.bkashSandbox !== undefined ? Boolean(priv.bkashSandbox) : true,
        nagad: Boolean((priv.nagadMerchantId || process.env.NAGAD_MERCHANT_ID) && (priv.nagadPrivateKey || process.env.NAGAD_PRIVATE_KEY)),
        nagadSandbox: priv.nagadSandbox !== undefined ? Boolean(priv.nagadSandbox) : true,
        nagadMerchantNumber: priv.nagadMerchantNumber || '',
      },
      transactions: paymentsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    });
  } catch (err) {
    console.error('Admin gateways error:', err);
    res.status(500).json({ error: 'Failed to load gateway settings' });
  }
});

app.post('/api/admin/gateways', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const body = req.body || {};
    if (body.publicFlags) {
      await adminDb.collection('settings').doc('payment_gateways_public').set(body.publicFlags, { merge: true });
    }
    if (body.credentials && req.adminRole === 'super_admin') {
      const c = body.credentials;
      const secretUpdate: Record<string, any> = {};
      if (c.sslcommerzStoreId) secretUpdate.sslcommerzStoreId = sanitizeText(c.sslcommerzStoreId, 160);
      if (c.sslcommerzStorePasswd) secretUpdate.sslcommerzStorePasswd = sanitizeText(c.sslcommerzStorePasswd, 160);
      if (typeof c.sslcommerzSandbox === 'boolean') secretUpdate.sslcommerzSandbox = c.sslcommerzSandbox;
      if (c.bkashAppKey) secretUpdate.bkashAppKey = sanitizeText(c.bkashAppKey, 160);
      if (c.bkashAppSecret) secretUpdate.bkashAppSecret = sanitizeText(c.bkashAppSecret, 160);
      if (c.bkashUsername) secretUpdate.bkashUsername = sanitizeText(c.bkashUsername, 160);
      if (c.bkashPassword) secretUpdate.bkashPassword = sanitizeText(c.bkashPassword, 160);
      if (typeof c.bkashSandbox === 'boolean') secretUpdate.bkashSandbox = c.bkashSandbox;
      if (c.nagadMerchantId) secretUpdate.nagadMerchantId = sanitizeText(c.nagadMerchantId, 160);
      if (c.nagadMerchantNumber) secretUpdate.nagadMerchantNumber = sanitizeText(c.nagadMerchantNumber, 40);
      if (c.nagadPublicKey) secretUpdate.nagadPublicKey = sanitizeText(c.nagadPublicKey, 2000);
      if (c.nagadPrivateKey) secretUpdate.nagadPrivateKey = sanitizeText(c.nagadPrivateKey, 4000);
      if (typeof c.nagadSandbox === 'boolean') secretUpdate.nagadSandbox = c.nagadSandbox;
      if (Object.keys(secretUpdate).length) {
        await adminDb.collection('settings_private').doc('payment_gateways').set(secretUpdate, { merge: true });
      }
    }
    await writeAuditLog(req, 'GATEWAY_SETTINGS_UPDATED', 'Updated payment gateway flags/credentials');
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin gateways save error:', err);
    res.status(500).json({ error: 'Failed to save gateway config' });
  }
});

app.post('/api/admin/payments/:paymentId/refund', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const paymentId = sanitizeText(req.params.paymentId, 128);
    const refundReason = sanitizeText(req.body?.refundReason, 300);
    if (!refundReason) {
      res.status(400).json({ error: 'Refund reason is required' });
      return;
    }
    const pRef = adminDb.collection('payments').doc(paymentId);
    const pSnap = await pRef.get();
    if (!pSnap.exists) {
      res.status(404).json({ error: 'Transaction record not found' });
      return;
    }
    const pData = pSnap.data()!;
    const nowIso = new Date().toISOString();
    await pRef.update({
      status: 'refunded',
      refundReason,
      refundedBy: req.authUser!.email,
      refundedAt: nowIso,
    });
    if (pData.orderId) {
      const oRef = adminDb.collection('orders').doc(pData.orderId);
      const oSnap = await oRef.get();
      if (oSnap.exists) {
        const order = oSnap.data()!;
        await oRef.update({
          paymentStatus: 'refunded',
          timeline: FieldValue.arrayUnion({
            status: order.orderStatus,
            titleEn: 'Payment Refunded',
            titleBn: 'পেমেন্ট রিফান্ড সম্পন্ন',
            noteEn: refundReason,
            noteBn: refundReason,
            actorEmail: req.authUser!.email,
            timestamp: nowIso,
          }),
          updatedAt: nowIso,
        });
        await createUserNotification(order.userId, {
          type: 'payment_confirmation',
          titleEn: `Refund Issued: ${order.orderNumber}`,
          titleBn: `রিফান্ড সম্পন্ন: ${order.orderNumber}`,
          bodyEn: `A refund for ৳${pData.amount} has been processed (${refundReason}).`,
          bodyBn: `আপনার ৳${pData.amount} টাকার রিফান্ড প্রক্রিয়া সম্পন্ন হয়েছে।`,
          orderNumber: order.orderNumber,
        });
      }
    }
    await writeAuditLog(req, 'PAYMENT_REFUNDED', `Issued refund for ${paymentId}: ${refundReason}`, paymentId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Audited Category, Coupon, Shipping & Site Settings Endpoints
app.post('/api/admin/categories', requireAdmin(['super_admin', 'admin', 'product_manager']), async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    const nameEn = sanitizeText(b.nameEn, 120);
    const nameBn = sanitizeText(b.nameBn, 120);
    if (!nameEn || !nameBn) {
      res.status(400).json({ error: 'Category EN and BN names required' });
      return;
    }
    const slug = (sanitizeText(b.slug, 120) || nameEn).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = sanitizeText(b.id, 120) || slug;
    await adminDb.collection('categories').doc(id).set({
      id,
      slug,
      nameEn,
      nameBn,
      parentId: sanitizeText(b.parentId, 120) || '',
      image: sanitizeText(b.image, 500) || '',
      sortOrder: Number(b.sortOrder || 10),
    });
    await writeAuditLog(req, 'CATEGORY_SAVED', `Saved category ${nameEn}`, id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Category save error:', err);
    res.status(500).json({ error: 'Failed to save category' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin(['super_admin', 'admin', 'product_manager']), async (req: AuthedRequest, res) => {
  const id = sanitizeText(req.params.id, 128);
  await adminDb.collection('categories').doc(id).delete();
  await writeAuditLog(req, 'CATEGORY_DELETED', `Deleted category ${id}`, id);
  res.json({ ok: true });
});

app.post('/api/admin/coupons', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    const code = sanitizeText(b.code, 40).toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Coupon code required' });
      return;
    }
    const id = sanitizeText(b.id, 128) || `coupon-${code.toLowerCase()}`;
    await adminDb.collection('coupons').doc(id).set(
      {
        id,
        code,
        type: b.type === 'fixed' ? 'fixed' : 'percentage',
        value: Math.max(1, Number(b.value || 10)),
        minOrderAmount: Math.max(0, Number(b.minOrderAmount || 0)),
        maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null,
        usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
        usedCount: Number(b.usedCount || 0),
        expiresAt: b.expiresAt || '2027-12-31T23:59:59.000Z',
        active: b.active !== false,
      },
      { merge: true }
    );
    await writeAuditLog(req, 'COUPON_SAVED', `Saved coupon ${code}`, id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Coupon save error:', err);
    res.status(500).json({ error: 'Failed to save coupon' });
  }
});

app.delete('/api/admin/coupons/:id', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  const id = sanitizeText(req.params.id, 128);
  await adminDb.collection('coupons').doc(id).delete();
  await writeAuditLog(req, 'COUPON_DELETED', `Deleted coupon ${id}`, id);
  res.json({ ok: true });
});

app.post('/api/admin/shipping', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    await adminDb.collection('settings').doc('shipping').set(req.body || {}, { merge: true });
    await writeAuditLog(req, 'SHIPPING_UPDATED', 'Updated shipping & delivery rules');
    res.json({ ok: true });
  } catch (err) {
    console.error('Shipping save error:', err);
    res.status(500).json({ error: 'Failed to save shipping rules' });
  }
});

app.post('/api/admin/site-settings', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    await adminDb.collection('settings').doc('site').set(req.body || {}, { merge: true });
    await writeAuditLog(req, 'CMS_SETTINGS_UPDATED', 'Updated website CMS content & global settings');
    res.json({ ok: true });
  } catch (err) {
    console.error('Site settings save error:', err);
    res.status(500).json({ error: 'Failed to save site settings' });
  }
});

app.get('/api/admin/staff', requireAdmin(['super_admin']), async (_req, res) => {
  const snap = await adminDb.collection('admins').get();
  res.json({ staff: snap.docs.map((d) => ({ uid: d.id, ...d.data() })) });
});

app.post('/api/admin/staff', requireAdmin(['super_admin']), async (req: AuthedRequest, res) => {
  try {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const role = sanitizeText(req.body?.role, 40);
    const active = req.body?.active !== false;
    if (!email || !['super_admin', 'admin', 'order_manager', 'product_manager'].includes(role)) {
      res.status(400).json({ error: 'Valid email and role required' });
      return;
    }
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      res.status(404).json({ error: 'User must sign in or register an account first before assigning an admin role.' });
      return;
    }
    await adminDb.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      role,
      active,
      updatedAt: new Date().toISOString(),
    });
    await writeAuditLog(req, 'STAFF_ROLE_UPDATED', `Assigned role ${role} (active: ${active}) to ${email}`, userRecord.uid);
    res.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    console.error('Admin staff save error:', err);
    res.status(500).json({ error: 'Failed to assign staff role' });
  }
});

// Send Promo Notification to all registered users (Admin)
app.post('/api/admin/notifications/broadcast', requireAdmin(['super_admin', 'admin']), async (req: AuthedRequest, res) => {
  try {
    const titleEn = sanitizeText(req.body?.titleEn, 200);
    const titleBn = sanitizeText(req.body?.titleBn, 200);
    const bodyEn = sanitizeText(req.body?.bodyEn, 600);
    const bodyBn = sanitizeText(req.body?.bodyBn, 600);
    const type = sanitizeText(req.body?.type, 40) || 'promo';
    if (!titleEn || !titleBn || !bodyEn || !bodyBn) {
      res.status(400).json({ error: 'All bilingual title and message fields are required' });
      return;
    }
    const usersSnap = await adminDb.collection('users').get();
    const batch = adminDb.batch();
    const nowIso = new Date().toISOString();
    usersSnap.docs.forEach((u) => {
      const ref = adminDb.collection('users').doc(u.id).collection('notifications').doc();
      batch.set(ref, { type, titleEn, titleBn, bodyEn, bodyBn, read: false, createdAt: nowIso });
    });
    await batch.commit();
    await writeAuditLog(req, 'NOTIFICATION_BROADCAST', `Sent ${type} broadcast "${titleEn}" to ${usersSnap.size} users`);
    res.json({ ok: true, count: usersSnap.size });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASVORE server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
