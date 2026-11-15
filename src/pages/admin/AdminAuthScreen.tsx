import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, KeyRound, Lock, Mail, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { auth } from '../../lib/firebase.ts';
import { ADMIN_TEXT, t } from '../../lib/i18n.ts';

interface AdminAuthScreenProps {
  dark: boolean;
  onToggleDark: () => void;
  onAuditLogin: () => Promise<void>;
}

export function AdminAuthScreen({ dark, onToggleDark, onAuditLogin }: AdminAuthScreenProps) {
  const { lang, toggleLang, user, isAdmin, loginWithEmail, loginWithGoogle, logout, apiFetch, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [generatedTokenPreview, setGeneratedTokenPreview] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const verifyAdminRoleOrWarn = async () => {
    const res = await apiFetch('/api/auth/me-role');
    const data = res.ok ? ((await res.json()) as { isAdmin: boolean; role?: string }) : { isAdmin: false };
    if (!data.isAdmin) {
      showToast(
        lang === 'bn'
          ? 'প্রবেশাধিকার নেই: এই অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।'
          : 'Access denied: this account does not hold an administrator role.',
        'error'
      );
      return false;
    }
    await onAuditLogin();
    showToast(lang === 'bn' ? 'অ্যাডমিন সাইন-ইন সম্পন্ন' : 'Administrator signed in', 'success');
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginWithEmail(email.trim(), password, true);
      await verifyAdminRoleOrWarn();
    } catch (err: any) {
      showToast(err?.message || 'Authentication failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      await loginWithGoogle(true);
      await verifyAdminRoleOrWarn();
    } catch (err: any) {
      showToast(err?.message || 'Google authentication failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(data.error || 'Could not generate reset token', 'error');
        return;
      }
      if (data.clientEmailFlow) {
        await sendPasswordResetEmail(auth, email.trim());
        showToast(
          lang === 'bn'
            ? 'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।'
            : 'Password reset link has been sent to your email inbox.',
          'success'
        );
        setMode('login');
        return;
      }
      if (data.resetToken) {
        setGeneratedTokenPreview(data.resetToken);
        setResetToken(data.resetToken);
      }
      showToast(lang === 'bn' ? data.messageBn : data.messageEn, 'success');
      setMode('reset');
    } catch (err: any) {
      showToast(err?.message || 'Could not send reset email', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
        return;
      }
      showToast(lang === 'bn' ? 'পাসওয়ার্ড রিসেট সফল হয়েছে' : 'Password reset successful', 'success');
      setMode('login');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0E0E10] text-[#111113] dark:text-[#FAF8F5] flex flex-col justify-between p-6">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5C5B57] dark:text-[#FAF8F5]/70 hover:text-[#111113] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(ADMIN_TEXT.viewStorefront, lang)}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              className="px-2.5 py-1.5 text-xs font-semibold border border-[#111113]/15 dark:border-white/15 cursor-pointer"
            >
              {lang === 'bn' ? 'EN' : 'বাংলা'}
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label="Toggle theme"
              className="p-2 border border-[#111113]/15 dark:border-white/15 cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4 text-[#C9A461]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto bg-white dark:bg-[#17171A] border border-[#111113]/12 dark:border-white/12 p-8 shadow-xl space-y-6 my-12">
          <div className="space-y-1.5 text-center">
            <div className="w-11 h-11 mx-auto bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B89352] pt-2">
              ASVORE · {t(ADMIN_TEXT.brandSub, lang)}
            </p>
            <h1 className="font-display text-3xl font-semibold">
              {t(ADMIN_TEXT.unauthorizedTitle, lang)}
            </h1>
            <p className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/65">
              {t(ADMIN_TEXT.unauthorizedDesc, lang)}
            </p>
          </div>

          {user && !isAdmin && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <p className="font-semibold">
                {lang === 'bn'
                  ? `বর্তমান অ্যাকাউন্ট (${user.email}) অ্যাডমিন অনুমোদিত নয়।`
                  : `Signed in as ${user.email}, which does not have admin privileges.`}
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="underline font-semibold cursor-pointer"
              >
                {lang === 'bn' ? 'অন্য অ্যাডমিন অ্যাকাউন্টে সাইন ইন করুন' : 'Sign out and switch account'}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'অ্যাডমিন ইমেইল' : 'Administrator Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@asvore.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent focus:outline-none focus:border-[#B89352]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent focus:outline-none focus:border-[#B89352]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-[#B89352] hover:underline cursor-pointer"
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {busy ? '...' : lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Sign In to Admin Panel'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#111113]/10 dark:border-white/10" />
                <span className="shrink mx-3 text-[11px] uppercase text-[#5C5B57]">or</span>
                <div className="grow border-t border-[#111113]/10 dark:border-white/10" />
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 border border-[#111113]/20 dark:border-white/20 text-xs font-semibold hover:border-[#B89352] cursor-pointer"
              >
                {lang === 'bn' ? 'গুগল দিয়ে অ্যাডমিন সাইন ইন' : 'Continue with Google Admin Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-[#5C5B57] dark:text-[#FAF8F5]/70">
                {lang === 'bn'
                  ? 'আপনার অ্যাডমিন ইমেইল দিন। পাসওয়ার্ড রিসেট করার জন্য ১৫ মিনিটের নিরাপদ টোকেন তৈরি হবে।'
                  : 'Enter your administrator email to generate a 15-minute password reset token.'}
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@asvore.com"
                className="w-full px-3 py-2.5 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-semibold uppercase cursor-pointer"
                >
                  {lang === 'bn' ? 'রিসেট টোকেন পাঠান' : 'Request Reset Token'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-4 py-2.5 border border-[#111113]/20 dark:border-white/20 text-xs cursor-pointer"
                >
                  {lang === 'bn' ? 'ফিরুন' : 'Back'}
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              {generatedTokenPreview && (
                <div className="p-3 bg-[#F2EFE9] dark:bg-white/5 border border-[#B89352]/40 text-[11px] font-mono-num break-all">
                  <span className="font-semibold block mb-1">Reset Token:</span>
                  {generatedTokenPreview}
                </div>
              )}
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Reset Token"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent font-mono-num"
                />
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 8 chars)"
                className="w-full px-3 py-2.5 text-sm border border-[#111113]/15 dark:border-white/15 bg-transparent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 bg-[#111113] dark:bg-[#C9A461] text-[#FAF8F5] dark:text-[#111113] text-xs font-semibold uppercase cursor-pointer"
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড আপডেট' : 'Confirm New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-4 py-2.5 border border-[#111113]/20 dark:border-white/20 text-xs cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#5C5B57] dark:text-[#FAF8F5]/50">
          ASVORE Menswear Bangladesh · Shaplamill, Gaibandha Sadar
        </p>
      </div>
    </div>
  );
}
