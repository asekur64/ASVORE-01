import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Printer, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { lang } = useApp();
  const paymentState = searchParams.get('payment');

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 lg:py-24 text-center">
      <div className="bg-white border border-[#111113]/10 p-8 sm:p-12 space-y-6">
        <CheckCircle2 className="w-12 h-12 text-[#B89352] mx-auto stroke-[1.5]" />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">
            ASVORE {lang === 'bn' ? 'অর্ডার কনফার্মেশন' : 'Order Confirmation'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111113]">
            {paymentState === 'failed'
              ? lang === 'bn'
                ? 'পেমেন্ট সম্পন্ন হয়নি'
                : 'Payment Was Not Completed'
              : lang === 'bn'
                ? 'আপনার অর্ডারের জন্য ধন্যবাদ'
                : 'Thank You for Your Order'}
          </h1>
        </div>

        <div className="py-4 px-6 bg-[#FAF8F5] border border-[#111113]/10 inline-block">
          <span className="text-xs text-[#5C5B57] uppercase tracking-wider block mb-1">
            {lang === 'bn' ? 'অর্ডার আইডি' : 'Order ID'}
          </span>
          <span className="font-mono-num text-xl font-bold text-[#111113]">{orderNumber}</span>
        </div>

        <p className="text-sm text-[#5C5B57] leading-relaxed max-w-md mx-auto">
          {paymentState === 'failed'
            ? lang === 'bn'
              ? 'পেমেন্ট গেটওয়ে থেকে পেমেন্ট ব্যর্থ হয়েছে। অনুগ্রহ করে অর্ডার ট্র্যাক করে পুনরায় চেষ্টা করুন অথবা 01719478830 নম্বরে যোগাযোগ করুন।'
              : 'The online payment could not be verified. Please contact 01719478830 or place a new order.'
            : lang === 'bn'
              ? 'আমাদের গাইবান্ধা স্টুডিও টিম আপনার অর্ডারটি যাচাই করে শীঘ্রই ডিসপ্যাচ করবে। মোবাইল নম্বর ও অর্ডার আইডি দিয়ে যেকোনো সময় স্ট্যাটাস দেখতে পারবেন।'
              : 'Our Gaibandha studio team has received your order and will prepare it for dispatch. Use your Order ID and phone number anytime to track delivery.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            to={`/track-order?order=${encodeURIComponent(orderNumber || '')}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111113] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>{lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Order'}</span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-3 border border-[#111113]/20 text-xs font-semibold uppercase tracking-wider hover:bg-[#F2EFE9] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'রসিদ প্রিন্ট' : 'Print Receipt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
