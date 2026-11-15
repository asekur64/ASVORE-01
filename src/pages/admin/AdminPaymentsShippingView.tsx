import { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Plus, RotateCcw, Trash2, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BANGLADESH_DISTRICTS } from '../../lib/bangladeshGeo.ts';
import { formatBdt } from '../../lib/i18n.ts';
import type { ManualMfsConfig, PaymentMethodId } from '../../types/index.ts';
import { ConfirmDialog } from './ConfirmDialog.tsx';

export function AdminPaymentsShippingView() {
  const { lang, adminRole, shippingSettings, gatewayFlags, apiFetch, showToast } = useApp();
  const isSuperAdmin = adminRole === 'super_admin';

  const [ship, setShip] = useState(shippingSettings);
  const [newDistName, setNewDistName] = useState('Dhaka');
  const [newDistCharge, setNewDistCharge] = useState(110);
  const [newUpazilaName, setNewUpazilaName] = useState('');
  const [newUpazilaCharge, setNewUpazilaCharge] = useState(60);
  const [newCourier, setNewCourier] = useState('');

  const [flags, setFlags] = useState(gatewayFlags);
  const [creds, setCreds] = useState({
    sslcommerzStoreId: '',
    sslcommerzStorePasswd: '',
    sslcommerzSandbox: true,
    bkashAppKey: '',
    bkashAppSecret: '',
    bkashUsername: '',
    bkashPassword: '',
    bkashSandbox: true,
    nagadMerchantId: '',
    nagadMerchantNumber: '',
    nagadPublicKey: '',
    nagadPrivateKey: '',
    nagadSandbox: true,
  });
  const [configuredStatus, setConfiguredStatus] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    setShip(shippingSettings);
  }, [shippingSettings]);

  useEffect(() => {
    setFlags(gatewayFlags);
  }, [gatewayFlags]);

  const loadGateways = async () => {
    const res = await apiFetch('/api/admin/gateways');
    if (res.ok) {
      const d = (await res.json()) as any;
      if (d.configured) {
        setConfiguredStatus(d.configured);
        setCreds((prev) => ({
          ...prev,
          sslcommerzSandbox: d.configured.sslcommerzSandbox ?? true,
          bkashSandbox: d.configured.bkashSandbox ?? true,
          nagadSandbox: d.configured.nagadSandbox ?? true,
          nagadMerchantNumber: d.configured.nagadMerchantNumber || '',
        }));
      }
      if (d.transactions) setTransactions(d.transactions);
    }
  };

  useEffect(() => {
    void loadGateways();
  }, []);

  const saveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/shipping', {
      method: 'POST',
      body: JSON.stringify(ship),
    });
    if (res.ok) {
      showToast(lang === 'bn' ? 'ডেলিভারি নিয়ম সংরক্ষিত হয়েছে' : 'Shipping settings saved', 'success');
    } else {
      showToast('Failed to save shipping rules', 'error');
    }
  };

  const saveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/gateways', {
      method: 'POST',
      body: JSON.stringify({
        publicFlags: flags,
        credentials: isSuperAdmin ? creds : undefined,
      }),
    });
    if (!res.ok) {
      showToast('Failed to save gateway config', 'error');
      return;
    }
    showToast(lang === 'bn' ? 'পেমেন্ট গেটওয়ে আপডেট হয়েছে' : 'Payment gateways updated', 'success');
    await loadGateways();
  };

  const updateManualMfs = (method: string, patch: Partial<ManualMfsConfig>) => {
    const current = flags.manualMfs?.[method] || {
      enabled: false,
      methodName: method.toUpperCase(),
      accountNumber: '',
      instructionsEn: '',
      instructionsBn: '',
    };
    setFlags({
      ...flags,
      manualMfs: {
        ...(flags.manualMfs || {}),
        [method]: { ...current, ...patch },
      },
    });
  };

  const handleConfirmRefund = async () => {
    if (!refundTarget || !refundReason.trim()) {
      showToast('Refund reason is required', 'error');
      return;
    }
    const res = await apiFetch(`/api/admin/payments/${refundTarget.id || refundTarget.orderNumber}/refund`, {
      method: 'POST',
      body: JSON.stringify({ refundReason: refundReason.trim() }),
    });
    setRefundTarget(null);
    setRefundReason('');
    if (res.ok) {
      showToast(lang === 'bn' ? 'রিফান্ড সম্পন্ন হয়েছে' : 'Refund processed & logged', 'success');
      await loadGateways();
    } else {
      showToast('Failed to process refund', 'error');
    }
  };

  const failedTx = transactions.filter((t) => t.status === 'failed');

  return (
    <div className="space-y-8">
      {/* Shipping & Delivery Management */}
      <form
        onSubmit={saveShipping}
        className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-6"
      >
        <div className="flex items-center gap-2 border-b border-[#111113]/10 dark:border-white/10 pb-3">
          <Truck className="w-4 h-4 text-[#B89352]" />
          <h2 className="font-display text-2xl font-semibold">
            {lang === 'bn' ? 'শিপিং ও ডেলিভারি ম্যানেজমেন্ট' : 'Shipping & Delivery Management'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Inside Gaibandha (৳)</label>
            <input
              type="number"
              value={ship.insideGaibandhaCharge}
              onChange={(e) => setShip({ ...ship, insideGaibandhaCharge: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Outside Gaibandha (৳)</label>
            <input
              type="number"
              value={ship.outsideGaibandhaCharge}
              onChange={(e) => setShip({ ...ship, outsideGaibandhaCharge: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Free Delivery Min (৳)</label>
            <input
              type="number"
              value={ship.freeShippingThreshold}
              onChange={(e) => setShip({ ...ship, freeShippingThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Est. Days (Inside)</label>
            <input
              type="text"
              value={ship.estimatedDaysInside}
              onChange={(e) => setShip({ ...ship, estimatedDaysInside: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Est. Days (Outside)</label>
            <input
              type="text"
              value={ship.estimatedDaysOutside}
              onChange={(e) => setShip({ ...ship, estimatedDaysOutside: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
          </div>
        </div>

        {/* District & Upazila Charge Overrides + Couriers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2 border-t border-[#111113]/10 dark:border-white/10">
          {/* District Overrides */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider">District Overrides</h4>
            <div className="flex gap-2">
              <select
                value={newDistName}
                onChange={(e) => setNewDistName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
              >
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d.nameEn} value={d.nameEn}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={newDistCharge}
                onChange={(e) => setNewDistCharge(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <button
                type="button"
                onClick={() =>
                  setShip({
                    ...ship,
                    districtOverrides: { ...(ship.districtOverrides || {}), [newDistName]: newDistCharge },
                  })
                }
                className="px-2.5 py-1.5 bg-[#111113] dark:bg-[#C9A461] text-white dark:text-[#111113] text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(ship.districtOverrides || {}).map(([dist, fee]) => (
                <div key={dist} className="flex justify-between py-1 border-b border-[#111113]/8 dark:border-white/8">
                  <span>
                    {dist}: <strong className="tabular-nums">৳{fee}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = { ...(ship.districtOverrides || {}) };
                      delete copy[dist];
                      setShip({ ...ship, districtOverrides: copy });
                    }}
                    className="text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upazila Overrides */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider">Upazila Overrides</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUpazilaName}
                onChange={(e) => setNewUpazilaName(e.target.value)}
                placeholder="e.g. Gobindaganj"
                className="flex-1 px-2.5 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <input
                type="number"
                value={newUpazilaCharge}
                onChange={(e) => setNewUpazilaCharge(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newUpazilaName.trim()) return;
                  setShip({
                    ...ship,
                    upazilaOverrides: {
                      ...(ship.upazilaOverrides || {}),
                      [newUpazilaName.trim()]: newUpazilaCharge,
                    },
                  });
                  setNewUpazilaName('');
                }}
                className="px-2.5 py-1.5 bg-[#111113] dark:bg-[#C9A461] text-white dark:text-[#111113] text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(ship.upazilaOverrides || {}).map(([upz, fee]) => (
                <div key={upz} className="flex justify-between py-1 border-b border-[#111113]/8 dark:border-white/8">
                  <span>
                    {upz}: <strong className="tabular-nums">৳{fee}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = { ...(ship.upazilaOverrides || {}) };
                      delete copy[upz];
                      setShip({ ...ship, upazilaOverrides: copy });
                    }}
                    className="text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Couriers */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider">Courier Partners</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCourier}
                onChange={(e) => setNewCourier(e.target.value)}
                placeholder="Steadfast / Pathao / RedX"
                className="flex-1 px-2.5 py-1.5 text-xs border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCourier.trim()) return;
                  const list = ship.couriers || ['Steadfast', 'Pathao', 'RedX'];
                  setShip({ ...ship, couriers: [...new Set([...list, newCourier.trim()])] });
                  setNewCourier('');
                }}
                className="px-2.5 py-1.5 bg-[#111113] dark:bg-[#C9A461] text-white dark:text-[#111113] text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {(ship.couriers || ['Steadfast', 'Pathao', 'RedX', 'Sundarban']).map((c) => (
                <div key={c} className="flex justify-between py-1 border-b border-[#111113]/8 dark:border-white/8">
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setShip({ ...ship, couriers: (ship.couriers || []).filter((x) => x !== c) })
                    }
                    className="text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Save Shipping Rules
        </button>
      </form>

      {/* Payment Gateway Configuration */}
      <form
        onSubmit={saveGateways}
        className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-6"
      >
        <div className="flex items-center gap-2 border-b border-[#111113]/10 dark:border-white/10 pb-3">
          <CreditCard className="w-4 h-4 text-[#B89352]" />
          <h2 className="font-display text-2xl font-semibold">
            {lang === 'bn' ? 'পেমেন্ট গেটওয়ে ম্যানেজমেন্ট' : 'Payment Gateway Management'}
          </h2>
        </div>

        <div className="flex flex-wrap gap-5 text-xs font-medium">
          {(
            [
              ['codEnabled', 'Cash on Delivery (COD)'],
              ['bkashEnabled', 'bKash'],
              ['nagadEnabled', 'Nagad'],
              ['rocketEnabled', 'Rocket'],
              ['upayEnabled', 'Upay'],
              ['sslcommerzEnabled', 'SSLCommerz'],
              ['cardEnabled', 'Visa / Mastercard'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean((flags as any)[key])}
                onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Manual MFS Merchant Instructions */}
        <div className="border-t border-[#111113]/10 dark:border-white/10 pt-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider">
            Manual MFS Instructions & Merchant Account Numbers (Displayed on Checkout when Enabled)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['bkash', 'nagad', 'rocket', 'upay'] as const).map((wallet) => {
              const cfg = flags.manualMfs?.[wallet] || {
                enabled: false,
                methodName: wallet.toUpperCase(),
                accountNumber: '',
                instructionsEn: '',
                instructionsBn: '',
              };
              return (
                <div key={wallet} className="p-3.5 border border-[#111113]/12 dark:border-white/12 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase">{wallet}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => updateManualMfs(wallet, { enabled: e.target.checked })}
                      />
                      <span>Show Instructions</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={cfg.accountNumber}
                    onChange={(e) => updateManualMfs(wallet, { accountNumber: e.target.value })}
                    placeholder="Merchant / Personal Number (e.g. 01719478830)"
                    className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent font-mono-num"
                  />
                  <input
                    type="text"
                    value={cfg.instructionsEn}
                    onChange={(e) => updateManualMfs(wallet, { instructionsEn: e.target.value })}
                    placeholder="Instructions (EN)"
                    className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <input
                    type="text"
                    value={cfg.instructionsBn}
                    onChange={(e) => updateManualMfs(wallet, { instructionsBn: e.target.value })}
                    placeholder="নির্দেশনা (বাংলা)"
                    className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Official API Credentials (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="border-t border-[#111113]/10 dark:border-white/10 pt-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Server-Side Merchant Credentials & Sandbox/Live Mode (Super Admin Only)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* SSLCommerz */}
              <div className="p-3.5 border border-[#111113]/12 dark:border-white/12 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold">SSLCommerz ({configuredStatus.sslcommerz ? 'Configured' : 'Not Set'})</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creds.sslcommerzSandbox}
                      onChange={(e) => setCreds({ ...creds, sslcommerzSandbox: e.target.checked })}
                    />
                    <span>Sandbox</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={creds.sslcommerzStoreId}
                  onChange={(e) => setCreds({ ...creds, sslcommerzStoreId: e.target.value })}
                  placeholder="New Store ID"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="password"
                  value={creds.sslcommerzStorePasswd}
                  onChange={(e) => setCreds({ ...creds, sslcommerzStorePasswd: e.target.value })}
                  placeholder="New Store Password"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
              </div>

              {/* bKash */}
              <div className="p-3.5 border border-[#111113]/12 dark:border-white/12 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">bKash ({configuredStatus.bkash ? 'Configured' : 'Not Set'})</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creds.bkashSandbox}
                      onChange={(e) => setCreds({ ...creds, bkashSandbox: e.target.checked })}
                    />
                    <span>Sandbox</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={creds.bkashAppKey}
                  onChange={(e) => setCreds({ ...creds, bkashAppKey: e.target.value })}
                  placeholder="App Key"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="password"
                  value={creds.bkashAppSecret}
                  onChange={(e) => setCreds({ ...creds, bkashAppSecret: e.target.value })}
                  placeholder="App Secret"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={creds.bkashUsername}
                    onChange={(e) => setCreds({ ...creds, bkashUsername: e.target.value })}
                    placeholder="Username"
                    className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                  <input
                    type="password"
                    value={creds.bkashPassword}
                    onChange={(e) => setCreds({ ...creds, bkashPassword: e.target.value })}
                    placeholder="Password"
                    className="px-2 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                  />
                </div>
              </div>

              {/* Nagad */}
              <div className="p-3.5 border border-[#111113]/12 dark:border-white/12 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Nagad ({configuredStatus.nagad ? 'Configured' : 'Not Set'})</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creds.nagadSandbox}
                      onChange={(e) => setCreds({ ...creds, nagadSandbox: e.target.checked })}
                    />
                    <span>Sandbox</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={creds.nagadMerchantId}
                  onChange={(e) => setCreds({ ...creds, nagadMerchantId: e.target.value })}
                  placeholder="Merchant ID"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="text"
                  value={creds.nagadMerchantNumber}
                  onChange={(e) => setCreds({ ...creds, nagadMerchantNumber: e.target.value })}
                  placeholder="Merchant Number"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
                <input
                  type="password"
                  value={creds.nagadPrivateKey}
                  onChange={(e) => setCreds({ ...creds, nagadPrivateKey: e.target.value })}
                  placeholder="RSA Private Key"
                  className="w-full px-2.5 py-1.5 border border-[#111113]/15 dark:border-white/15 bg-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <select
            value={flags.defaultMethod}
            onChange={(e) => setFlags({ ...flags, defaultMethod: e.target.value as PaymentMethodId })}
            className="px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-white dark:bg-[#17171A]"
          >
            <option value="cod">Default: Cash on Delivery</option>
            <option value="bkash">Default: bKash</option>
            <option value="nagad">Default: Nagad</option>
            <option value="sslcommerz">Default: SSLCommerz</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Save Gateway Configuration
          </button>
        </div>
      </form>

      {/* Failed Payment Tracker */}
      {failedTx.length > 0 && (
        <div className="bg-white dark:bg-[#17171A] border border-red-600/30 p-6 space-y-3">
          <h3 className="font-display text-xl font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>Failed Payment Tracker ({failedTx.length})</span>
          </h3>
          <div className="divide-y divide-[#111113]/8 dark:divide-white/8 text-xs">
            {failedTx.map((tx, i) => (
              <div key={i} className="py-2 flex justify-between">
                <span className="font-mono-num font-semibold">
                  {tx.orderNumber} · {String(tx.gateway || '').toUpperCase()}
                </span>
                <span className="tabular-nums">{formatBdt(tx.amount || 0, lang)} · FAILED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions & Refunds */}
      <div className="bg-white dark:bg-[#17171A] border border-[#111113]/10 dark:border-white/10 p-6 space-y-4">
        <h3 className="font-display text-xl font-semibold">Gateway Transactions & Refund Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF8F5] dark:bg-white/5 border-b border-[#111113]/10 dark:border-white/10 uppercase text-[#5C5B57] dark:text-[#FAF8F5]/65">
              <tr>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Gateway</th>
                <th className="py-2.5 px-3">Trx ID</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111113]/8 dark:divide-white/8">
              {transactions.map((tx, i) => (
                <tr key={i}>
                  <td className="py-2.5 px-3 font-mono-num font-bold">{tx.orderNumber}</td>
                  <td className="py-2.5 px-3 uppercase">{tx.gateway}</td>
                  <td className="py-2.5 px-3 font-mono-num">{tx.transactionId || 'Pending'}</td>
                  <td className="py-2.5 px-3 tabular-nums font-semibold">{formatBdt(tx.amount || 0, lang)}</td>
                  <td className="py-2.5 px-3 uppercase font-semibold">{tx.status}</td>
                  <td className="py-2.5 px-3 text-right">
                    {tx.status === 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRefundTarget(tx);
                          setRefundReason('');
                        }}
                        className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Issue Refund</span>
                      </button>
                    )}
                    {tx.status === 'refunded' && (
                      <span className="text-[#5C5B57]">Refunded ({tx.refundReason})</span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#5C5B57]">
                    No gateway transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-[#111113]/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17171A] border border-[#111113]/15 dark:border-white/15 max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold">
              Issue Refund for {refundTarget.orderNumber}
            </h3>
            <p className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/70">
              Amount: <strong>{formatBdt(refundTarget.amount, lang)}</strong> ({refundTarget.gateway?.toUpperCase()})
            </p>
            <input
              type="text"
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter audited refund reason..."
              className="w-full px-3 py-2 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-4 py-2 text-xs border border-[#111113]/20 dark:border-white/20 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRefund()}
                className="px-4 py-2 text-xs font-semibold bg-red-700 text-white cursor-pointer"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={false}
        lang={lang}
        title=""
        message=""
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </div>
  );
}
