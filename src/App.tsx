import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { OrderTrackingPage } from './pages/OrderTrackingPage.tsx';
import { WishlistPage } from './pages/WishlistPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ContentPage } from './pages/ContentPage.tsx';
import { AdminPage } from './pages/admin/AdminPage.tsx';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ASVORE render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#111113] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <span className="font-display text-3xl font-bold tracking-[0.2em]">ASVORE</span>
          <h1 className="font-display text-2xl font-semibold">We encountered a display issue</h1>
          <p className="text-sm text-[#5C5B57] max-w-md">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Reload Storefront
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { siteSettings, isAdmin, lang } = useApp();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (siteSettings.seoTitle) document.title = siteSettings.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && siteSettings.seoDescription) {
      metaDesc.setAttribute('content', siteSettings.seoDescription);
    }
    if (siteSettings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettings.faviconUrl;
    }
  }, [siteSettings.seoTitle, siteSettings.seoDescription, siteSettings.faviconUrl]);

  if (siteSettings.maintenanceMode && !isAdmin && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#111113] text-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="font-display text-4xl font-bold tracking-[0.2em]">
          {siteSettings.websiteName || siteSettings.companyName || 'ASVORE'}
        </span>
        <h1 className="font-display text-2xl text-[#C9A461]">
          {lang === 'bn' ? 'সাইটটি সাময়িক রক্ষণাবেক্ষণে রয়েছে' : 'Scheduled Studio Maintenance'}
        </h1>
        <p className="text-sm text-[#FAF8F5]/70 max-w-md">
          {lang === 'bn'
            ? `আমরা শীঘ্রই নতুন কালেকশন নিয়ে ফিরে আসছি। জরুরি প্রয়োজনে কল করুন: ${siteSettings.contactNumber || '01719478830'}`
            : `We are refining our seasonal catalog and will return shortly. Inquiries: ${siteSettings.contactNumber || '01719478830'}`}
        </p>
      </div>
    );
  }

  if (isAdminRoute) {
    return <AdminPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111113]">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/track-order" element={<OrderTrackingPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/about" element={<ContentPage page="about" />} />
          <Route path="/contact" element={<ContentPage page="contact" />} />
          <Route path="/faq" element={<ContentPage page="faq" />} />
          <Route path="/policies/:type" element={<ContentPage page="policy" />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
