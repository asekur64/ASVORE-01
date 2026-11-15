import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { auth } from '../lib/firebase.ts';
import { isValidBdPhone } from '../lib/bangladeshGeo.ts';

function getPasswordStrength(pw: string): { score: number; labelEn: string; labelBn: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, labelEn: 'Weak', labelBn: 'দুর্বল' };
  if (score === 2) return { score, labelEn: 'Fair', labelBn: 'মাঝারি' };
  if (score === 3) return { score, labelEn: 'Strong', labelBn: 'শক্তিশালী' };
  return { score, labelEn: 'Very Strong', labelBn: 'অত্যন্ত শক্তিশালী' };
}

export function LoginPage() {
  const { lang, loginWithGoogle, loginWithEmail, registerWithEmail, showToast } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);

  const strength = getPasswordStrength(password);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await loginWithGoogle(rememberMe);
      showToast(lang === 'bn' ? 'সফলভাবে লগইন হয়েছে' : 'Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err?.message || 'Google Sign-In failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginWithEmail(email.trim(), password, rememberMe);
      showToast(lang === 'bn' ? 'স্বাগতম! লগইন সম্পন্ন হয়েছে' : 'Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(
        err?.code === 'auth/invalid-credential'
          ? lang === 'bn'
            ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়'
            : 'Invalid email or password'
          : err?.message || 'Sign in failed',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !isValidBdPhone(phone)) {
      showToast(
        lang === 'bn' ? 'সঠিক নাম ও বাংলাদেশি মোবাইল নম্বর দিন' : 'Please provide full name and valid BD phone',
        'error'
      );
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      showToast(
        lang === 'bn'
          ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে এবং মিলতে হবে'
          : 'Passwords must match and be at least 8 characters',
        'error'
      );
      return;
    }
    setBusy(true);
    try {
      await registerWithEmail(fullName.trim(), email.trim(), phone.trim(), password);
      showToast(
        lang === 'bn'
          ? 'অ্যাকাউন্ট তৈরি হয়েছে! ভেরিফিকেশন ইমেইল পাঠানো হয়েছে।'
          : 'Account created! Verification email sent.',
        'success'
      );
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err?.message || 'Registration failed', 'error');
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
      await sendPasswordResetEmail(auth, email.trim()).catch(() => {});
      if (!res.ok) {
        showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
        return;
      }
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setMode('reset');
      }
      showToast(lang === 'bn' ? data.messageBn : data.messageEn, 'success');
    } finally {
      setBusy(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirmPassword) {
      showToast(
        lang === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর ও মিলতে হবে' : 'Passwords must match (min 8 chars)',
        'error'
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword: password }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(lang === 'bn' ? data.errorBn || data.error : data.error, 'error');
        return;
      }
      showToast(lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন হয়েছে! এখন লগইন করুন।' : 'Password reset! Sign in now.', 'success');
      setPassword('');
      setConfirmPassword('');
      setMode('login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 lg:py-20">
      <div className="bg-white border border-[#111113]/10 p-7 sm:p-9 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">ASVORE</p>
          <h1 className="font-display text-3xl font-semibold text-[#111113]">
            {mode === 'login' && (lang === 'bn' ? 'অ্যাকাউন্টে সাইন ইন' : 'Client Sign In')}
            {mode === 'register' && (lang === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি' : 'Create Account')}
            {mode === 'forgot' && (lang === 'bn' ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'Forgot Password')}
            {mode === 'reset' && (lang === 'bn' ? 'নতুন পাসওয়ার্ড সেট' : 'Reset Password')}
          </h1>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full py-3 px-4 border border-[#111113]/20 bg-[#FAF8F5] hover:bg-[#111113] hover:text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'Google দিয়ে চালিয়ে যান' : 'Continue with Google'}
            </button>
            <div className="relative flex items-center justify-center text-xs text-[#5C5B57]">
              <span className="border-t border-[#111113]/10 w-full" />
              <span className="px-3 bg-white uppercase tracking-wider">{lang === 'bn' ? 'অথবা' : 'OR'}</span>
              <span className="border-t border-[#111113]/10 w-full" />
            </div>
          </>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'ইমেইল' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#111113]"
                />
                <span>{lang === 'bn' ? 'মনে রাখুন' : 'Remember me'}</span>
              </label>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-[#B89352] hover:underline cursor-pointer"
              >
                {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'সাইন ইন' : 'Sign In'}
            </button>

            <p className="text-center text-xs text-[#5C5B57]">
              {lang === 'bn' ? 'অ্যাকাউন্ট নেই?' : 'New to ASVORE?'}{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-[#111113] underline cursor-pointer"
              >
                {lang === 'bn' ? 'নিবন্ধন করুন' : 'Create Account'}
              </button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#5C5B57] absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'ইমেইল' : 'Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)' : 'Password (Min 8 chars)'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
              {password && (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <div className="flex gap-1 flex-1 mr-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 ${
                          i <= strength.score ? 'bg-[#B89352]' : 'bg-[#111113]/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[#5C5B57]">{lang === 'bn' ? strength.labelBn : strength.labelEn}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#B89352] hover:text-[#111113] transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
            </button>

            <p className="text-center text-xs text-[#5C5B57]">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-[#111113] underline cursor-pointer"
              >
                {lang === 'bn' ? 'আগের অ্যাকাউন্টে সাইন ইন করুন' : 'Already have an account? Sign In'}
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-xs text-[#5C5B57]">
              {lang === 'bn'
                ? 'আপনার নিবন্ধিত ইমেইল লিখুন। নিরাপদ রিসেট টোকেন ও লিংক প্রদান করা হবে।'
                : 'Enter your registered email to receive a secure, expiring password reset token.'}
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15 focus:outline-none focus:border-[#B89352]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {lang === 'bn' ? 'রিসেট লিংক পাঠান' : 'Request Reset Token'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs text-[#5C5B57] underline cursor-pointer"
            >
              {lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetConfirm} className="space-y-4">
            <div className="p-3 bg-[#FAF8F5] border border-[#111113]/10 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B89352] shrink-0 mt-0.5" />
              <span>
                {lang === 'bn'
                  ? 'আপনার নিরাপদ রিসেট টোকেন যাচাই করে নতুন পাসওয়ার্ড সেট করুন।'
                  : 'Enter your reset token and choose a new password.'}
              </span>
            </div>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Reset token"
              className="w-full px-3.5 py-2.5 text-xs font-mono-num border border-[#111113]/15"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড (৮+ অক্ষর)' : 'New password (8+ chars)'}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
            />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111113]/15"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-[#111113] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {lang === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Confirm New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
