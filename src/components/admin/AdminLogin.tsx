import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { BusinessProfile } from '../../types';
import { BrandName } from '../common/BrandName';

interface AdminLoginProps {
  businessProfile: BusinessProfile;
  onLoginSuccess: () => void;
  onBackToCatalogue: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  businessProfile,
  onLoginSuccess,
  onBackToCatalogue,
  onShowToast,
}) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPassword = password.trim();

    if (!enteredPassword) {
      setErrorMsg('Please enter the admin password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    // Check custom updated password from localStorage or master password "Ayra@2026"
    const savedPassword = localStorage.getItem('ayra_admin_custom_password') || 'Ayra@2026';

    if (enteredPassword === savedPassword || enteredPassword === 'Ayra@2026') {
      localStorage.setItem('ayra_admin_session', 'true');
      onShowToast('Welcome back, AYRA FASHION Admin!', 'success');
      onLoginSuccess();
    } else {
      setErrorMsg('Incorrect password. Please enter the valid admin password.');
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
      localStorage.setItem('ayra_admin_session', 'true');
      onShowToast('Signed in successfully with Google!', 'success');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Google Sign-In was cancelled or failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#050505] text-[#F5F5F5]">
      <div className="max-w-md w-full bg-[#0D0D0D] rounded-3xl border border-[#D4AF37]/30 shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#18181B] to-[#0D0D0D] p-1 border-2 border-[#D4AF37]/60 shadow-lg mx-auto mb-4 overflow-hidden">
            <img
              src="/logo.jpg"
              alt={businessProfile.businessName}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-2xl tracking-[0.2em]">
            <BrandName name={businessProfile.businessName} className="font-black text-2xl" />
          </h2>
          <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest mt-1">
            Store Owner / Admin Portal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-password-input"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. Ayra@2026)"
                className="w-full pl-10 pr-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Login to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <span className="relative bg-[#0D0D0D] px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
            Or Sign In
          </span>
        </div>

        <div className="space-y-3">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Sign in with Google Account</span>
          </button>
        </div>

        {/* Back link */}
        <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-end text-xs text-zinc-400">
          <button
            type="button"
            onClick={onBackToCatalogue}
            className="text-[#D4AF37] hover:underline font-semibold cursor-pointer"
          >
            ← Back to Catalogue
          </button>
        </div>
      </div>
    </div>
  );
};
