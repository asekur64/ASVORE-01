import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  LineChart,
  Package,
  PieChart,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ADMIN_TEXT, formatBdt, ORDER_STATUS_LABELS, t } from '../../lib/i18n.ts';
import type { Language, OrderStatus } from '../../types/index.ts';
import { AdminTableSkeleton } from './ConfirmDialog.tsx';

export type DateRangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'last_month' | 'custom';

interface AdminOverviewViewProps {
  lang: Language;
  overview: any;
  loading: boolean;
  dateRange: DateRangePreset;
  setDateRange: (r: DateRangePreset) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
  onNavigateTab: (tab: any) => void;
}

type RevenueHorizon = 'weekly' | 'monthly' | 'yearly';

interface AreaSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

function SvgAreaLineChart({
  points,
  accentHex,
  height = 170,
  formatVal,
  secondaryLabel,
}: {
  points: AreaSeriesPoint[];
  accentHex: string;
  height?: number;
  formatVal: (v: number) => string;
  secondaryLabel?: (p: AreaSeriesPoint) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 520;
  const padX = 20;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = height - padY * 2;
  const maxV = Math.max(1, ...points.map((p) => Number(p.primary || 0)));

  const coords = points.map((p, i) => {
    const x = points.length <= 1 ? padX + innerW / 2 : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - (Number(p.primary || 0) / maxV) * innerH;
    return { x, y, point: p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${coords[0].x.toFixed(
          1
        )} ${(padY + innerH).toFixed(1)} Z`
      : '';

  const activePoint = hoverIdx !== null ? coords[hoverIdx] : coords[coords.length - 1];
  const gradId = `grad_${accentHex.replace(/[^a-zA-Z0-9]/g, '')}_${points.length}`;

  return (
    <div className="space-y-3">
      {activePoint && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs border-b border-[#111113]/8 dark:border-white/8 pb-2">
          <span className="text-[#5C5B57] dark:text-[#FAF8F5]/65 font-medium">{activePoint.point.label}</span>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="font-mono-num font-bold text-[#111113] dark:text-[#FAF8F5]">
              {formatVal(activePoint.point.primary)}
            </span>
            {secondaryLabel && (
              <span className="text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/60">
                {secondaryLabel(activePoint.point)}
              </span>
            )}
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-44 overflow-visible" role="img">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accentHex} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((tRatio, idx) => {
          const y = padY + innerH * tRatio;
          return (
            <line
              key={idx}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray={tRatio === 1 ? undefined : '3 3'}
            />
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={accentHex} strokeWidth="2.5" strokeLinejoin="round" />}

        {coords.map((c, i) => {
          const active = hoverIdx === i;
          return (
            <g key={`${c.point.label}-${i}`} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
              <circle
                cx={c.x}
                cy={c.y}
                r={active ? 5.5 : 3.5}
                fill={active ? accentHex : '#FAF8F5'}
                stroke={accentHex}
                strokeWidth="2"
                className="cursor-pointer transition-all"
              />
              <rect x={c.x - 16} y={0} width={32} height={height} fill="transparent" className="cursor-pointer" />
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/60 font-mono-num px-1">
        {points.map((p, i) => (
          <span key={`${p.label}-${i}`} className="truncate">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const ORDER_SEGMENT_COLORS: Record<string, string> = {
  pending: '#D97706',
  confirmed: '#2563EB',
  processing: '#B89352',
  shipped: '#0D9488',
  delivered: '#16A34A',
  cancelled: '#DC2626',
};

export function AdminOverviewView({
  lang,
  overview,
  loading,
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  onNavigateTab,
}: AdminOverviewViewProps) {
  const [revenueHorizon, setRevenueHorizon] = useState<RevenueHorizon>('monthly');
  const [hoveredDailyIdx, setHoveredDailyIdx] = useState<number | null>(null);
  const [hoveredMonthlyIdx, setHoveredMonthlyIdx] = useState<number | null>(null);

  const s = overview?.stats || {};
  const charts = overview?.charts || {};

  const dailySales: { label: string; revenue: number; orders: number }[] = charts.dailySales || [];
  const monthlySales: { label: string; revenue: number; orders: number }[] = charts.monthlySales || [];
  const weeklySales: { label: string; revenue: number; orders: number }[] = charts.weeklySales || [];
  const yearlySales: { label: string; revenue: number; orders: number }[] = charts.yearlySales || [];
  const customerGrowth: { label: string; value: number; cumulative?: number }[] = charts.customerGrowth || [];
  const bestSellingProducts: any[] = overview?.bestSellingProducts || [];

  const orderBreakdown = useMemo(() => {
    const raw: { key: string; count: number }[] = charts.orderBreakdown || [
      { key: 'pending', count: s.pendingOrders || 0 },
      { key: 'confirmed', count: s.confirmedOrders || 0 },
      { key: 'processing', count: s.processingOrders || 0 },
      { key: 'shipped', count: s.shippedOrders || 0 },
      { key: 'delivered', count: s.deliveredOrders || 0 },
      { key: 'cancelled', count: s.cancelledOrders || 0 },
    ];
    const total = Math.max(
      1,
      raw.reduce((acc, r) => acc + Number(r.count || 0), 0)
    );
    const hasOrders = raw.some((r) => Number(r.count || 0) > 0);
    return { items: raw, total, hasOrders };
  }, [charts.orderBreakdown, s]);

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 animate-pulse" />
          ))}
        </div>
        <AdminTableSkeleton rows={5} />
      </div>
    );
  }

  const kpiCards = [
    { label: t(ADMIN_TEXT.kpis.totalRevenue, lang), val: formatBdt(s.totalRevenue || 0, lang), accent: true },
    { label: t(ADMIN_TEXT.kpis.todaysRevenue, lang), val: formatBdt(s.todaysRevenue || 0, lang), accent: true },
    { label: t(ADMIN_TEXT.kpis.monthlyRevenue, lang), val: formatBdt(s.monthlyRevenue || 0, lang), accent: true },
    { label: t(ADMIN_TEXT.kpis.totalOrders, lang), val: s.totalOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.pendingOrders, lang), val: s.pendingOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.confirmedOrders, lang), val: s.confirmedOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.processingOrders, lang), val: s.processingOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.shippedOrders, lang), val: s.shippedOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.deliveredOrders, lang), val: s.deliveredOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.cancelledOrders, lang), val: s.cancelledOrders || 0 },
    { label: t(ADMIN_TEXT.kpis.totalCustomers, lang), val: s.totalCustomers || 0 },
    { label: t(ADMIN_TEXT.kpis.newCustomers, lang), val: s.newCustomers || 0 },
    { label: t(ADMIN_TEXT.kpis.totalProducts, lang), val: s.totalProducts || 0 },
    { label: t(ADMIN_TEXT.kpis.activeProducts, lang), val: s.activeProducts || 0 },
    { label: t(ADMIN_TEXT.kpis.outOfStockProducts, lang), val: s.outOfStockProducts || 0, warn: (s.outOfStockProducts || 0) > 0 },
    { label: t(ADMIN_TEXT.kpis.lowStockProducts, lang), val: s.lowStockProducts || 0, warn: (s.lowStockProducts || 0) > 0 },
  ];

  const maxDaily = Math.max(1, ...dailySales.map((d) => Number(d.revenue || 0)));
  const maxMonthly = Math.max(1, ...monthlySales.map((d) => Number(d.revenue || 0)));
  const maxBestUnits = Math.max(1, ...bestSellingProducts.map((p) => Number(p.soldCount || 0)));

  const revenueSeriesSource =
    revenueHorizon === 'weekly' ? weeklySales : revenueHorizon === 'yearly' ? yearlySales : monthlySales;
  const revenueAreaPoints: AreaSeriesPoint[] = revenueSeriesSource.map((item) => ({
    label: item.label,
    primary: Number(item.revenue || 0),
    secondary: Number(item.orders || 0),
  }));

  const customerAreaPoints: AreaSeriesPoint[] = customerGrowth.map((item) => ({
    label: item.label,
    primary: Number(item.cumulative ?? item.value ?? 0),
    secondary: Number(item.value || 0),
  }));

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let runningDashOffset = 0;

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-4">
        <div className="flex flex-wrap gap-1.5">
          {(['today', 'yesterday', '7d', '30d', 'month', 'last_month', 'custom'] as DateRangePreset[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDateRange(id)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                dateRange === id
                  ? 'bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] border-[#111113] dark:border-[#C9A461]'
                  : 'bg-transparent border-[#111113]/15 dark:border-white/15 hover:border-[#B89352]'
              }`}
            >
              {t(ADMIN_TEXT.dateFilters[id], lang)}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
            <span className="text-[#5C5B57]">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
        )}
      </div>

      {/* 16 Real-Time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-4 flex flex-col justify-between"
          >
            <p className="text-[11px] uppercase tracking-wider text-[#5C5B57] dark:text-[#FAF8F5]/60 truncate">
              {kpi.label}
            </p>
            <p
              className={`text-lg font-bold mt-2 tabular-nums ${
                kpi.warn
                  ? 'text-red-700 dark:text-red-400'
                  : kpi.accent
                    ? 'text-[#B89352]'
                    : 'text-[#111113] dark:text-[#FAF8F5]'
              }`}
            >
              {kpi.val}
            </p>
          </div>
        ))}
      </div>

      {/* Row 1 Charts: Daily Sales + Monthly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Sales Chart */}
        <section className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'দৈনিক বিক্রয় (১৪ দিন)' : 'Daily Sales'}
              </h3>
            </div>
            <span className="text-xs font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/65">
              {hoveredDailyIdx !== null && dailySales[hoveredDailyIdx]
                ? `${dailySales[hoveredDailyIdx].label} · ${formatBdt(dailySales[hoveredDailyIdx].revenue, lang)} (${dailySales[hoveredDailyIdx].orders})`
                : lang === 'bn'
                  ? `মোট ${dailySales.reduce((a, b) => a + b.orders, 0)} অর্ডার`
                  : `${dailySales.reduce((a, b) => a + b.orders, 0)} orders / 14d`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div
              className="grid gap-1.5 items-end h-48 pt-6 border-b border-[#111113]/10 dark:border-white/10 min-w-[420px]"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, dailySales.length)}, minmax(0, 1fr))` }}
            >
              {dailySales.map((pt, i) => {
                const pct = pt.revenue > 0 ? Math.max(8, Math.round((Number(pt.revenue) / maxDaily) * 100)) : 4;
                return (
                  <div
                    key={`${pt.label}-${i}`}
                    onMouseEnter={() => setHoveredDailyIdx(i)}
                    onMouseLeave={() => setHoveredDailyIdx(null)}
                    className="flex flex-col items-center gap-1 h-full justify-end group cursor-pointer"
                  >
                    <span className="text-[9px] font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/60 opacity-0 group-hover:opacity-100 truncate">
                      {formatBdt(pt.revenue, lang)}
                    </span>
                    <div
                      title={`${pt.label}: ${formatBdt(pt.revenue, lang)} (${pt.orders} orders)`}
                      className={`w-full max-w-[22px] transition-colors ${
                        pt.revenue > 0
                          ? 'bg-[#111113] dark:bg-[#FAF8F5]/85 group-hover:bg-[#B89352]'
                          : 'bg-[#111113]/10 dark:bg-white/10'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-[10px] font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/60 pb-1.5 truncate">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Monthly Sales Chart */}
        <section className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'মাসিক বিক্রয় (৬ মাস)' : 'Monthly Sales'}
              </h3>
            </div>
            <span className="text-xs font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/65">
              {hoveredMonthlyIdx !== null && monthlySales[hoveredMonthlyIdx]
                ? `${monthlySales[hoveredMonthlyIdx].label} · ${formatBdt(monthlySales[hoveredMonthlyIdx].revenue, lang)} (${monthlySales[hoveredMonthlyIdx].orders})`
                : formatBdt(
                    monthlySales.reduce((acc, m) => acc + Number(m.revenue || 0), 0),
                    lang
                  )}
            </span>
          </div>

          <div
            className="grid gap-3 items-end h-48 pt-6 border-b border-[#111113]/10 dark:border-white/10"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, monthlySales.length)}, minmax(0, 1fr))` }}
          >
            {monthlySales.map((pt, i) => {
              const pct = pt.revenue > 0 ? Math.max(10, Math.round((Number(pt.revenue) / maxMonthly) * 100)) : 4;
              return (
                <div
                  key={`${pt.label}-${i}`}
                  onMouseEnter={() => setHoveredMonthlyIdx(i)}
                  onMouseLeave={() => setHoveredMonthlyIdx(null)}
                  className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                >
                  <span className="text-[10px] font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/70 truncate max-w-full">
                    {formatBdt(pt.revenue, lang)}
                  </span>
                  <div
                    title={`${pt.label}: ${formatBdt(pt.revenue, lang)} (${pt.orders} orders)`}
                    className={`w-full max-w-[38px] transition-colors ${
                      pt.revenue > 0
                        ? 'bg-[#B89352] group-hover:bg-[#111113] dark:group-hover:bg-[#FAF8F5]'
                        : 'bg-[#111113]/10 dark:bg-white/10'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-[11px] font-medium text-[#5C5B57] dark:text-[#FAF8F5]/65 pb-1.5">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Row 2 Charts: Revenue Overview + Order Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3. Revenue Overview (Area & Trend Line) */}
        <section className="lg:col-span-7 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'রাজস্ব সারসংক্ষেপ' : 'Revenue Overview'}
              </h3>
            </div>
            <div className="flex gap-1">
              {(
                [
                  ['weekly', lang === 'bn' ? 'সাপ্তাহিক' : 'Weekly'],
                  ['monthly', lang === 'bn' ? 'মাসিক' : 'Monthly'],
                  ['yearly', lang === 'bn' ? 'বাৎসরিক' : 'Yearly'],
                ] as const
              ).map(([horizon, label]) => (
                <button
                  key={horizon}
                  type="button"
                  onClick={() => setRevenueHorizon(horizon)}
                  className={`px-2.5 py-1 text-xs font-semibold border cursor-pointer whitespace-nowrap shrink-0 ${
                    revenueHorizon === horizon
                      ? 'bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] border-transparent'
                      : 'border-[#111113]/15 dark:border-white/15'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SvgAreaLineChart
            points={revenueAreaPoints}
            accentHex="#B89352"
            formatVal={(v) => formatBdt(v, lang)}
            secondaryLabel={(p) =>
              lang === 'bn' ? `${p.secondary || 0}টি অর্ডার` : `${p.secondary || 0} orders`
            }
          />
        </section>

        {/* 4. Order Statistics (Donut + Status Breakdown) */}
        <section className="lg:col-span-5 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'অর্ডার পরিসংখ্যান' : 'Order Statistics'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'ম্যানেজ' : 'Orders'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeWidth="16"
                  />
                  {orderBreakdown.hasOrders &&
                    orderBreakdown.items.map((seg) => {
                      const count = Number(seg.count || 0);
                      if (count <= 0) return null;
                      const segLen = (count / orderBreakdown.total) * circumference;
                      const offset = runningDashOffset;
                      runningDashOffset += segLen;
                      return (
                        <circle
                          key={seg.key}
                          cx="72"
                          cy="72"
                          r={radius}
                          fill="none"
                          stroke={ORDER_SEGMENT_COLORS[seg.key] || '#B89352'}
                          strokeWidth="16"
                          strokeDasharray={`${segLen} ${circumference}`}
                          strokeDashoffset={-offset}
                        />
                      );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono-num text-xl font-bold">{s.totalOrders || 0}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#5C5B57] dark:text-[#FAF8F5]/60">
                    {lang === 'bn' ? 'মোট অর্ডার' : 'Orders'}
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-7 divide-y divide-[#111113]/8 dark:divide-white/10 text-xs">
              {orderBreakdown.items.map((seg) => {
                const count = Number(seg.count || 0);
                const pct = orderBreakdown.hasOrders ? Math.round((count / orderBreakdown.total) * 100) : 0;
                const labelObj = ORDER_STATUS_LABELS[seg.key as OrderStatus];
                const text = labelObj ? labelObj[lang] : seg.key;
                return (
                  <div key={seg.key} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 shrink-0"
                        style={{ backgroundColor: ORDER_SEGMENT_COLORS[seg.key] || '#B89352' }}
                      />
                      <span className="truncate font-medium">{text}</span>
                    </div>
                    <span className="font-mono-num shrink-0 text-[#5C5B57] dark:text-[#FAF8F5]/75">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Row 3 Charts: Customer Growth + Best Selling Products Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 5. Customer Growth Chart */}
        <section className="lg:col-span-6 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'গ্রাহক বৃদ্ধির হার' : 'Customer Growth'}
              </h3>
            </div>
            <span className="text-xs font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/65">
              {lang === 'bn' ? `মোট ${s.totalCustomers || 0} জন` : `${s.totalCustomers || 0} total members`}
            </span>
          </div>

          <SvgAreaLineChart
            points={customerAreaPoints}
            accentHex="#16A34A"
            formatVal={(v) => (lang === 'bn' ? `${v} মোট গ্রাহক` : `${v} total customers`)}
            secondaryLabel={(p) =>
              lang === 'bn' ? `+${p.secondary || 0} এই মাসে` : `+${p.secondary || 0} new in month`
            }
          />
        </section>

        {/* 6. Best Selling Products Chart */}
        <section className="lg:col-span-6 bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#B89352]" />
              <h3 className="font-display text-xl font-semibold">
                {lang === 'bn' ? 'সর্বাধিক বিক্রিত পণ্য' : 'Best Selling Products'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'সব পণ্য' : 'Catalog'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {bestSellingProducts.map((p: any, idx: number) => {
              const sold = Number(p.soldCount || 0);
              const pct = sold > 0 ? Math.max(8, Math.round((sold / maxBestUnits) * 100)) : 4;
              const rev = Number(p.revenueGenerated || sold * Number(p.discountPrice ?? p.regularPrice ?? 0));
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium truncate">
                      <span className="font-mono-num text-[#B89352] mr-1.5">0{idx + 1}.</span>
                      {lang === 'bn' ? p.nameBn : p.nameEn}
                    </span>
                    <span className="font-mono-num shrink-0 text-[#5C5B57] dark:text-[#FAF8F5]/75">
                      {sold} sold · {formatBdt(rev, lang)}
                    </span>
                  </div>
                  <div className="h-2 bg-[#111113]/8 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#B89352] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {bestSellingProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-[#5C5B57] dark:text-[#FAF8F5]/60">
                {t(ADMIN_TEXT.common.noData, lang)}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Operational Panels: Low Stock, Recent Orders, Recent Customers, Latest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B89352]" />
              <span>
                {lang === 'bn' ? 'সীমিত স্টক পণ্য' : 'Low Stock Products'} ({(overview?.lowStockList || []).length})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'স্টক আপডেট' : 'Manage'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#111113]/8 dark:divide-white/10 text-xs">
            {(overview?.lowStockList || []).slice(0, 6).map((p: any) => (
              <div key={p.id} className="py-2.5 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{lang === 'bn' ? p.nameBn : p.nameEn}</p>
                  <p className="text-[11px] font-mono-num text-[#5C5B57] dark:text-[#FAF8F5]/55">
                    {p.sku} · {formatBdt(p.discountPrice ?? p.regularPrice, lang)}
                  </p>
                </div>
                <span className="font-mono-num font-bold text-red-700 dark:text-red-400 shrink-0">
                  {p.stock} left
                </span>
              </div>
            ))}
            {(overview?.lowStockList || []).length === 0 && (
              <p className="text-[#5C5B57] dark:text-[#FAF8F5]/60 py-6 text-center">
                {lang === 'bn' ? 'সব পণ্যের স্টক স্বাভাবিক রয়েছে।' : 'All inventory levels are healthy.'}
              </p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#B89352]" />
              <span>{lang === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent Orders'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'সকল অর্ডার' : 'All Orders'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#111113]/8 dark:divide-white/10 text-xs">
            {(overview?.recentOrders || []).map((o: any) => (
              <div key={o.id} className="py-2.5 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <span className="font-mono-num font-bold mr-2">{o.orderNumber}</span>
                  <span className="text-[#5C5B57] dark:text-[#FAF8F5]/70">{o.customerName}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold tabular-nums block">{formatBdt(o.grandTotal, lang)}</span>
                  <span className="text-[11px] text-[#B89352]">
                    {ORDER_STATUS_LABELS[o.orderStatus as OrderStatus]?.[lang] || o.orderStatus}
                  </span>
                </div>
              </div>
            ))}
            {(overview?.recentOrders || []).length === 0 && (
              <p className="py-4 text-[#5C5B57] dark:text-[#FAF8F5]/60">{t(ADMIN_TEXT.common.noData, lang)}</p>
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B89352]" />
              <span>{lang === 'bn' ? 'নতুন গ্রাহক' : 'Recent Customers'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('customers')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'সব দেখুন' : 'View All'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#111113]/8 dark:divide-white/10 text-xs">
            {(overview?.recentCustomers || []).map((c: any) => (
              <div key={c.uid} className="py-2.5 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.fullName || 'ASVORE Member'}</p>
                  <p className="text-[#5C5B57] dark:text-[#FAF8F5]/60 truncate">{c.email}</p>
                </div>
                <span className="font-mono-num text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/60 shrink-0">
                  {c.phone || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Transactions */}
        <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#B89352]" />
              <span>{lang === 'bn' ? 'সাম্প্রতিক লেনদেন' : 'Latest Transactions'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('paymentsShipping')}
              className="text-xs font-semibold text-[#B89352] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{lang === 'bn' ? 'গেটওয়ে' : 'Gateways'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#111113]/8 dark:divide-white/10 text-xs">
            {(overview?.latestTransactions || []).map((tx: any, idx: number) => (
              <div key={idx} className="py-2.5 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="font-mono-num font-semibold truncate">{tx.orderNumber}</p>
                  <p className="text-[#5C5B57] dark:text-[#FAF8F5]/60 truncate">
                    {String(tx.gateway || '').toUpperCase()} · {tx.transactionId || 'Awaiting'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold tabular-nums block">{formatBdt(tx.amount || 0, lang)}</span>
                  <span
                    className={`text-[11px] uppercase ${
                      tx.status === 'paid'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : tx.status === 'failed'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-[#B89352]'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            {(overview?.latestTransactions || []).length === 0 && (
              <p className="py-4 text-[#5C5B57] dark:text-[#FAF8F5]/60 flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{lang === 'bn' ? 'কোনো অনলাইন পেমেন্ট রেকর্ড নেই।' : 'No gateway transactions recorded yet.'}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
