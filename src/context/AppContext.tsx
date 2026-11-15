import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase.ts';
import {
  SEED_CATEGORIES,
  SEED_GATEWAY_FLAGS,
  SEED_PRODUCTS,
  SEED_SHIPPING,
  SEED_SITE_SETTINGS,
} from '../lib/seedData.ts';
import type {
  AdminRole,
  AppNotification,
  CartItem,
  Category,
  Language,
  Product,
  PublicGatewayFlags,
  ShippingSettings,
  SiteSettings,
  UserProfile,
} from '../types/index.ts';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  products: Product[];
  categories: Category[];
  catalogLoading: boolean;
  siteSettings: SiteSettings;
  shippingSettings: ShippingSettings;
  gatewayFlags: PublicGatewayFlags;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, qty?: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateCartQty: (productId: string, qty: number, size?: string, color?: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  loginWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  registerWithEmail: (fullName: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = 'asvore_cart_v1';
const WISHLIST_STORAGE_KEY = 'asvore_wishlist_v1';
const LANG_STORAGE_KEY = 'asvore_lang_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'bn';
    } catch {
      return 'bn';
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(SEED_SITE_SETTINGS);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(SEED_SHIPPING);
  const [gatewayFlags, setGatewayFlags] = useState<PublicGatewayFlags>(SEED_GATEWAY_FLAGS);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage failure
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Trigger server bootstrap once to ensure Firestore has initial ASVORE data
  useEffect(() => {
    fetch('/api/bootstrap').catch(() => {});
  }, []);

  // Subscribe to public Firestore collections (products, categories, settings)
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const qProducts = query(collection(db, 'products'), where('published', '==', true));
    unsubs.push(
      onSnapshot(
        qProducts,
        (snap) => {
          if (!snap.empty) {
            setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })));
          }
          setCatalogLoading(false);
        },
        () => {
          setCatalogLoading(false);
        }
      )
    );

    const qCats = query(collection(db, 'categories'), orderBy('sortOrder', 'asc'));
    unsubs.push(
      onSnapshot(
        qCats,
        (snap) => {
          if (!snap.empty) {
            setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })));
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'site'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<SiteSettings>;
            setSiteSettings((prev) => ({
              ...prev,
              ...data,
              hero: { ...prev.hero, ...(data.hero || {}) },
              promoBanner: { ...prev.promoBanner, ...(data.promoBanner || {}) },
              policies: { ...prev.policies, ...(data.policies || {}) },
            }));
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'shipping'),
        (snap) => {
          if (snap.exists()) {
            setShippingSettings((prev) => ({ ...prev, ...(snap.data() as Partial<ShippingSettings>) }));
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'payment_gateways_public'),
        (snap) => {
          if (snap.exists()) {
            setGatewayFlags((prev) => ({ ...prev, ...(snap.data() as Partial<PublicGatewayFlags>) }));
          }
        },
        () => {}
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  // Auth listener & user subcollections
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubWishlist: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubProfile) unsubProfile();
      if (unsubWishlist) unsubWishlist();
      if (unsubNotifs) unsubNotifs();

      if (!firebaseUser) {
        setProfile(null);
        setIsAdmin(false);
        setAdminRole(null);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      // Ensure user profile doc exists
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        await setDoc(
          userRef,
          {
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ASVORE Client',
            email: firebaseUser.email || '',
            photoUrl: firebaseUser.photoURL || '',
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {
        // ignore if already exists with immutable constraints
      }

      unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        },
        () => {}
      );

      unsubWishlist = onSnapshot(
        collection(db, 'users', firebaseUser.uid, 'wishlist'),
        (snap) => {
          setWishlistIds(snap.docs.map((d) => d.data().productId as string));
        },
        () => {}
      );

      unsubNotifs = onSnapshot(
        query(collection(db, 'users', firebaseUser.uid, 'notifications'), orderBy('createdAt', 'desc')),
        (snap) => {
          setNotifications(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
          );
        },
        () => {}
      );

      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/auth/me-role', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { isAdmin: boolean; role: AdminRole | 'customer' };
          setIsAdmin(Boolean(data.isAdmin));
          setAdminRole(data.isAdmin ? (data.role as AdminRole) : null);
          if (data.isAdmin) {
            fetch('/api/bootstrap', {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        }
      } catch {
        setIsAdmin(false);
        setAdminRole(null);
      }

      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubWishlist) unsubWishlist();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
    []
  );

  const addToCart = useCallback(
    (product: Product, qty = 1, size?: string, color?: string) => {
      const chosenSize = size || product.sizes?.[0] || '';
      const chosenColor = color || product.colors?.[0]?.nameEn || '';
      const unitPrice =
        product.discountPrice !== null && product.discountPrice > 0
          ? product.discountPrice
          : product.regularPrice;

      setCart((prev) => {
        const idx = prev.findIndex(
          (item) =>
            item.productId === product.id &&
            (item.size || '') === chosenSize &&
            (item.color || '') === chosenColor
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: Math.min(product.stock || 20, updated[idx].quantity + qty),
          };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            sku: product.sku,
            nameEn: product.nameEn,
            nameBn: product.nameBn,
            image: product.images?.[0] || '',
            unitPrice,
            regularPrice: product.regularPrice,
            quantity: qty,
            size: chosenSize,
            color: chosenColor,
          },
        ];
      });
      showToast(
        lang === 'bn' ? `${product.nameBn} ব্যাগে যোগ করা হয়েছে` : `${product.nameEn} added to bag`,
        'success'
      );
      setCartOpen(true);
    },
    [lang, showToast]
  );

  const removeFromCart = useCallback((productId: string, size = '', color = '') => {
    setCart((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && (i.size || '') === size && (i.color || '') === color)
      )
    );
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number, size = '', color = '') => {
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter(
          (i) => !(i.productId === productId && (i.size || '') === size && (i.color || '') === color)
        )
      );
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId && (i.size || '') === size && (i.color || '') === color
          ? { ...i, quantity: Math.min(20, qty) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const exists = wishlistIds.includes(productId);
      if (user) {
        const ref = doc(db, 'users', user.uid, 'wishlist', productId);
        if (exists) {
          await deleteDoc(ref);
          showToast(lang === 'bn' ? 'উইশলিস্ট থেকে সরানো হয়েছে' : 'Removed from wishlist');
        } else {
          await setDoc(ref, { productId, addedAt: new Date().toISOString() });
          showToast(lang === 'bn' ? 'উইশলিস্টে সংরক্ষিত হয়েছে' : 'Saved to wishlist', 'success');
        }
      } else {
        const next = exists ? wishlistIds.filter((id) => id !== productId) : [...wishlistIds, productId];
        setWishlistIds(next);
        try {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        showToast(
          exists
            ? lang === 'bn'
              ? 'উইশলিস্ট থেকে সরানো হয়েছে'
              : 'Removed from wishlist'
            : lang === 'bn'
              ? 'উইশলিস্টে সংরক্ষিত হয়েছে'
              : 'Saved to wishlist',
          exists ? 'info' : 'success'
        );
      }
    },
    [wishlistIds, user, lang, showToast]
  );

  const loginWithGoogle = useCallback(async (rememberMe = true) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    await signInWithPopup(auth, googleAuthProvider);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string, rememberMe = true) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const registerWithEmail = useCallback(
    async (fullName: string, email: string, phone: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        fullName,
        email,
        phone,
        phoneVerified: false,
        photoUrl: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await sendEmailVerification(cred.user).catch(() => {});
      const token = await cred.user.getIdToken().catch(() => '');
      if (token) {
        fetch('/api/customers/sync-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fullName }),
        }).catch(() => {});
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cart]);
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value: AppContextValue = {
    lang,
    setLang,
    toggleLang,
    user,
    profile,
    authReady,
    isAdmin,
    adminRole,
    products,
    categories,
    catalogLoading,
    siteSettings,
    shippingSettings,
    gatewayFlags,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    wishlistIds,
    toggleWishlist,
    notifications,
    unreadNotificationsCount,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    apiFetch,
    showToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto px-4 py-3 text-sm font-medium shadow-lg border transition-all duration-200 ${
              toast.type === 'error'
                ? 'bg-[#111113] text-red-200 border-red-500/40'
                : toast.type === 'success'
                  ? 'bg-[#111113] text-[#FAF8F5] border-[#B89352]/50'
                  : 'bg-white text-[#111113] border-[#111113]/15'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
