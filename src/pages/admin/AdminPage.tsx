import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  LogOut,
  Menu,
  Moon,
  Package,
  ShoppingCart,
  Sun,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { ADMIN_TEXT, t } from '../../lib/i18n.ts';
import type { AdminNotification, AdminRole, Order } from '../../types/index.ts';
import { AdminAuthScreen } from './AdminAuthScreen.tsx';
import {
  AdminCategoriesCouponsView,
  AdminCmsAndSettingsView,
  AdminNotificationsAndLogsView,
} from './AdminCmsSettingsView.tsx';
import { AdminCustomersView } from './AdminCustomersView.tsx';
import { AdminOrdersView } from './AdminOrdersView.tsx';
import { AdminOverviewView, type DateRangePreset } from './AdminOverviewView.tsx';
import { AdminPaymentsShippingView } from './AdminPaymentsShippingView.tsx';
import { AdminProductsView } from './AdminProductsView.tsx';

type AdminTabId =
  | 'overview'
  | 'orders'
  | 'customers'
  | 'products'
  | 'categoriesCoupons'
  | 'paymentsShipping'
  | 'cmsSettings'
  | 'notificationsLogs';

const DARK_STORAGE_KEY = 'asvore_admin_dark_v1';

export function AdminPage() {
  const { lang, toggleLang, user, authReady, isAdmin, adminRole, logout, apiFetch } = useApp();

  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DARK_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DARK_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState<AdminTabId>('overview');

  // Overview state
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Orders & Customers state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Admin Notifications
  const [adminNotifs, setAdminNotifs] = useState<AdminNotification[]>([]);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const qs = new URLSearchParams({ range: dateRange });
      if (dateRange === 'custom' && customStart) qs.set('start', customStart);
      if (dateRange === 'custom' && customEnd) qs.set('end', customEnd);
      const res = await apiFetch(`/api/admin/overview?${qs.toString()}`);
      if (res.ok) setOverview(await res.json());
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await apiFetch('/api/admin/orders');
      if (res.ok) setOrders(((await res.json()) as any).orders || []);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const res = await apiFetch('/api/admin/customers');
      if (res.ok) setCustomers(((await res.json()) as any).customers || []);
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadAdminNotifications = async () => {
    const res = await apiFetch('/api/admin/notifications');
    if (res.ok) setAdminNotifs(((await res.json()) as any).notifications || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadOverview();
    void loadAdminNotifications();
  }, [isAdmin, dateRange, customStart, customEnd]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'orders') void loadOrders();
    if (tab === 'customers') void loadCustomers();
    if (tab === 'notificationsLogs') void loadAdminNotifications();
  }, [isAdmin, tab]);

  const role: AdminRole = adminRole || 'admin';
  const navItems = useMemo(() => {
    const all: { id: AdminTabId; icon: any; label: { en: string; bn: string }; roles: AdminRole[] }[] = [
      {
        id: 'overview',
        icon: BarChart3,
        label: ADMIN_TEXT.tabs.overview,
        roles: ['super_admin', 'admin', 'order_manager', 'product_manager'],
      },
      {
        id: 'orders',
        icon: ShoppingCart,
        label: ADMIN_TEXT.tabs.orders,
        roles: ['super_admin', 'admin', 'order_manager'],
      },
      {
        id: 'customers',
        icon: Users,
        label: ADMIN_TEXT.tabs.customers,
        roles: ['super_admin', 'admin', 'order_manager'],
      },
      {
        id: 'products',
        icon: Package,
        label: ADMIN_TEXT.tabs.products,
        roles: ['super_admin', 'admin', 'product_manager'],
      },
      {
        id: 'categoriesCoupons',
        icon: Tag,
        label: ADMIN_TEXT.tabs.categoriesCoupons,
        roles: ['super_admin', 'admin', 'product_manager'],
      },
      {
        id: 'paymentsShipping',
        icon: CreditCard,
        label: ADMIN_TEXT.tabs.paymentsShipping,
        roles: ['super_admin', 'admin'],
      },
      {
        id: 'cmsSettings',
        icon: Globe,
        label: ADMIN_TEXT.tabs.cmsSettings,
        roles: ['super_admin', 'admin'],
      },
      {
        id: 'notificationsLogs',
        icon: FileText,
        label: ADMIN_TEXT.tabs.notificationsLogs,
        roles: ['super_admin', 'admin'],
      },
    ];
    return all.filter((i) => i.roles.includes(role));
  }, [role]);

  const unreadCount = adminNotifs.filter((n) => !n.read).length;

  const markNotifRead = async (id: string) => {
    setAdminNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'POST' });
  };

  const markAllNotifsRead = async () => {
    setAdminNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await apiFetch('/api/admin/notifications/read-all', { method: 'POST' });
  };

  const handleAuditLogin = async () => {
    await apiFetch('/api/admin/audit-login', { method: 'POST' }).catch(() => {});
  };

  const handleAdminLogout = async () => {
    await apiFetch('/api/admin/audit-logout', { method: 'POST' }).catch(() => {});
    await logout();
  };

  if (!authReady) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0E0E10] text-[#111113] dark:text-[#FAF8F5] flex items-center justify-center text-sm">
          {t(ADMIN_TEXT.verifyingSession, lang)}
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminAuthScreen dark={dark} onToggleDark={toggleDark} onAuditLogin={handleAuditLogin} />;
  }

  const activeNav = navItems.find((n) => n.id === tab) || navItems[0];

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen flex bg-[#FAF8F5] dark:bg-[#0E0E10] text-[#111113] dark:text-[#FAF8F5]">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[#111113]/10 dark:border-white/10 bg-[#111113] text-[#FAF8F5] transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
            {!sidebarCollapsed ? (
              <div>
                <span className="font-display text-xl font-bold tracking-[0.2em] block">ASVORE</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#C9A461]">
                  {role.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <span className="font-display text-xl font-bold text-[#C9A461] mx-auto">A</span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              className="p-1.5 text-[#FAF8F5]/70 hover:text-white cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  title={t(item.label, lang)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#C9A461] text-[#111113]'
                      : 'text-[#FAF8F5]/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{t(item.label, lang)}</span>}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1.5">
            <Link
              to="/"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[#FAF8F5]/75 hover:text-[#C9A461]"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{t(ADMIN_TEXT.viewStorefront, lang)}</span>}
            </Link>
            <button
              type="button"
              onClick={() => void handleAdminLogout()}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-300 hover:text-red-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{t(ADMIN_TEXT.signOut, lang)}</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60" />
            <div className="relative z-10 w-64 bg-[#111113] text-[#FAF8F5] h-full flex flex-col justify-between p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="font-display text-xl font-bold tracking-[0.18em]">ASVORE</span>
                  <button type="button" onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold ${
                        tab === item.id ? 'bg-[#C9A461] text-[#111113]' : 'text-[#FAF8F5]/80'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.label, lang)}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link to="/" className="block text-xs text-[#C9A461]">
                  {t(ADMIN_TEXT.viewStorefront, lang)}
                </Link>
                <button type="button" onClick={() => void handleAdminLogout()} className="text-xs text-red-300">
                  {t(ADMIN_TEXT.signOut, lang)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#17171A] border-b border-[#111113]/10 dark:border-white/10 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open admin menu"
                className="lg:hidden p-2 -ml-2 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#B89352] font-semibold">
                  ASVORE · {t(ADMIN_TEXT.brandSub, lang)}
                </p>
                <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">
                  {t(activeNav.label, lang)}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLang}
                className="px-2.5 py-1.5 text-xs font-semibold border border-[#111113]/15 dark:border-white/15 hover:border-[#B89352] cursor-pointer"
              >
                {lang === 'bn' ? 'EN' : 'বাংলা'}
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                type="button"
                onClick={toggleDark}
                aria-label="Toggle Dark Mode"
                className="p-2 border border-[#111113]/15 dark:border-white/15 hover:border-[#B89352] cursor-pointer"
              >
                {dark ? <Sun className="w-4 h-4 text-[#C9A461]" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notification Center Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifPopoverOpen((o) => !o)}
                  aria-label="Admin notifications"
                  className="relative p-2 border border-[#111113]/15 dark:border-white/15 hover:border-[#B89352] cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#B89352] text-[#111113] text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifPopoverOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#17171A] border border-[#111113]/15 dark:border-white/15 shadow-2xl z-50 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#111113]/10 dark:border-white/10 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === 'bn' ? 'অ্যাডমিন বিজ্ঞপ্তি' : 'Notifications'} ({unreadCount})
                      </span>
                      <button
                        type="button"
                        onClick={() => void markAllNotifsRead()}
                        className="text-[11px] font-semibold text-[#B89352] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#111113]/8 dark:divide-white/8 text-xs">
                      {adminNotifs.slice(0, 12).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => void markNotifRead(n.id)}
                          className={`py-2.5 cursor-pointer ${!n.read ? 'font-semibold' : 'opacity-65'}`}
                        >
                          <p>{lang === 'bn' ? n.titleBn : n.titleEn}</p>
                          <p className="text-[#5C5B57] dark:text-[#FAF8F5]/65 font-normal">
                            {lang === 'bn' ? n.bodyBn : n.bodyEn}
                          </p>
                        </div>
                      ))}
                      {adminNotifs.length === 0 && (
                        <p className="py-4 text-center text-[#5C5B57]">All caught up.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:block text-right pl-2 border-l border-[#111113]/10 dark:border-white/10">
                <p className="text-xs font-semibold truncate max-w-[140px]">{user.displayName || user.email}</p>
                <p className="text-[10px] uppercase text-[#B89352]">{role.replace('_', ' ')}</p>
              </div>
            </div>
          </header>

          {/* Main Tab Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {tab === 'overview' && (
              <AdminOverviewView
                lang={lang}
                overview={overview}
                loading={overviewLoading}
                dateRange={dateRange}
                setDateRange={setDateRange}
                customStart={customStart}
                setCustomStart={setCustomStart}
                customEnd={customEnd}
                setCustomEnd={setCustomEnd}
                onNavigateTab={(next) => setTab(next)}
              />
            )}

            {tab === 'orders' && (
              <AdminOrdersView
                orders={orders}
                loading={ordersLoading}
                canDelete={role === 'super_admin' || role === 'admin'}
                onRefresh={loadOrders}
              />
            )}

            {tab === 'customers' && (
              <AdminCustomersView
                customers={customers}
                loading={customersLoading}
                canEdit={role === 'super_admin' || role === 'admin'}
                onRefresh={loadCustomers}
              />
            )}

            {tab === 'products' && <AdminProductsView />}
            {tab === 'categoriesCoupons' && <AdminCategoriesCouponsView />}
            {tab === 'paymentsShipping' && <AdminPaymentsShippingView />}
            {tab === 'cmsSettings' && <AdminCmsAndSettingsView />}
            {tab === 'notificationsLogs' && (
              <AdminNotificationsAndLogsView
                notifications={adminNotifs}
                onMarkRead={markNotifRead}
                onMarkAllRead={markAllNotifsRead}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
