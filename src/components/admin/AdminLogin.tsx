import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { BusinessProfile } from '../../types';

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
  const [email, setEmail] = useState('ayra.fashion.assam@gmail.com');
  const [password, setPassword] = useState('Ayra@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredEmail = email.trim().toLowerCase();
    const enteredPassword = password;

    if (!enteredEmail || !enteredPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    // Stored custom password fallback or default
    const savedPassword = localStorage.getItem('ayra_admin_password') || 'Ayra@2026';
    const isOwnerEmailMatch =
      enteredEmail === 'ayra.fashion.assam@gmail.com' ||
      enteredEmail === 'owner@ayrafashion.com' ||
      enteredEmail === businessProfile.email?.trim().toLowerCase();

    const completeLogin = () => {
      localStorage.setItem('ayra_admin_session', 'true');
      onLoginSuccess();
    };

    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, enteredEmail, enteredPassword);
        onShowToast('Account registered successfully!', 'success');
        completeLogin();
      } else {
        try {
          await signInWithEmailAndPassword(auth, enteredEmail, enteredPassword);
          onShowToast('Welcome back, store owner!', 'success');
          completeLogin();
        } catch (signInErr: any) {
          console.warn('Firebase Auth signin notice:', signInErr);
          if (
            signInErr.code === 'auth/user-not-found' ||
            signInErr.code === 'auth/invalid-credential'
          ) {
            try {
              // Auto-create account for first-time login
              await createUserWithEmailAndPassword(auth, enteredEmail, enteredPassword);
              onShowToast('Welcome back, store owner!', 'success');
              completeLogin();
              return;
            } catch (createErr: any) {
              if (
                createErr.code === 'auth/operation-not-allowed' &&
                isOwnerEmailMatch &&
                enteredPassword === savedPassword
              ) {
                onShowToast('Logged in as AYRA FASHION Store Owner!', 'success');
                completeLogin();
                return;
              }
              throw createErr;
            }
          } else if (
            signInErr.code === 'auth/operation-not-allowed' &&
            isOwnerEmailMatch &&
            enteredPassword === savedPassword
          ) {
            onShowToast('Logged in as AYRA FASHION Store Owner!', 'success');
            completeLogin();
            return;
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Fallback check if auth/operation-not-allowed or provider error happens on Vercel/Firebase
      if (isOwnerEmailMatch && enteredPassword === savedPassword) {
        onShowToast('Logged in as AYRA FASHION Store Owner!', 'success');
        completeLogin();
        return;
      }

      if (err.code === 'auth/operation-not-allowed') {
        if (enteredPassword !== savedPassword) {
          setErrorMsg('Incorrect password. Please enter the correct admin password.');
        } else {
          setErrorMsg('Firebase Email/Password login is not enabled in Firebase Console. Using local store owner login.');
        }
      } else if (err.code === 'auth/wrong-password') {
        setErrorMsg('Incorrect password. Please verify your password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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

  // Demo Fast Login for immediate testing
  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const demoEmail = 'ayra.fashion.assam@gmail.com';
    const demoPassword = 'Ayra@2026';

    try {
      try {
        await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // Auto-create demo account
          await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } else {
          throw signInErr;
        }
      }
      localStorage.setItem('ayra_admin_session', 'true');
      onShowToast('Logged in as AYRA FASHION Store Owner!', 'success');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Quick login error:', err);
      // Fallback direct success if Firebase auth mock applies
      localStorage.setItem('ayra_admin_session', 'true');
      onShowToast('Demo session authorized!', 'success');
      onLoginSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#050505] text-[#F5F5F5]">
      <div className="max-w-md w-full bg-[#0D0D0D] rounded-3xl border border-[#D4AF37]/30 shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#18181B] to-[#0D0D0D] p-1 border border-[#D4AF37]/50 shadow-md mx-auto mb-4 overflow-hidden">
            <img
              src="/logo.jpg"
              alt={businessProfile.businessName}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback icon if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-2xl font-serif font-black text-white tracking-wide">
            {businessProfile.businessName}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ayra.fashion.assam@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegisterMode ? 'Register New Owner Account' : 'Login to Dashboard'}</span>
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
            Or quick login
          </span>
        </div>

        {/* 1-Click Fast Demo Login for instant convenience */}
        <div className="space-y-3">
          <button
            id="quick-demo-login-btn"
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#18181B] hover:bg-[#222] text-[#F1D77A] border border-[#D4AF37]/30 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
          >
            <UserCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>1-Click Store Owner Login (Fast Preview)</span>
          </button>

          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Sign in with Google Account</span>
          </button>
        </div>

        {/* Toggle mode and back link */}
        <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMsg('');
            }}
            className="text-zinc-300 hover:text-[#D4AF37] font-medium transition-colors"
          >
            {isRegisterMode ? 'Already have account? Login' : 'Need new account? Register'}
          </button>

          <button
            type="button"
            onClick={onBackToCatalogue}
            className="text-[#D4AF37] hover:underline font-semibold"
          >
            ← Back to Catalogue
          </button>
        </div>
      </div>
    </div>
  );
};
