import React from 'react';
import {
  ShoppingBag,
  LayoutDashboard,
  Layers,
  Settings,
  Image as ImageIcon,
  Eye,
  LogOut,
  LogIn,
  Share2,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface NavbarProps {
  currentView: 'catalogue' | 'admin-dashboard' | 'admin-products' | 'admin-categories' | 'admin-settings' | 'admin-banners' | 'admin-login';
  onNavigate: (view: 'catalogue' | 'admin-dashboard' | 'admin-products' | 'admin-categories' | 'admin-settings' | 'admin-banners' | 'admin-login') => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  businessProfile: BusinessProfile;
  onShare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isAuthenticated,
  onLogout,
  businessProfile,
  onShare,
}) => {
  const isAdminView = currentView.startsWith('admin') && currentView !== 'admin-login';

  return (
    <header className="relative w-full bg-[#0B0B0B] border-b border-[#D4AF37]/30 z-30 transition-all text-white shadow-lg">
      {/* Top Announcement Bar for Desktop & Tablet */}
      <div className="hidden sm:block bg-[#050505] text-zinc-300 text-xs py-1.5 px-4 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            <span className="font-brand-logo font-bold text-white tracking-[0.14em] text-xs">{businessProfile.businessName}</span>
            <span className="text-zinc-400">• {businessProfile.businessType}</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              id="header-call-link"
              href={`tel:${businessProfile.contactNumber.replace(/[^0-9+]/g, '')}`}
              className="flex items-center space-x-1.5 text-zinc-300 hover:text-[#D4AF37] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-mono">{businessProfile.contactNumber}</span>
            </a>
            <a
              id="header-whatsapp-link"
              href={`https://wa.me/${businessProfile.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(businessProfile.businessName)}%2C%20I%20have%20an%20enquiry.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Order</span>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Header (Clean 2-Row Layout) */}
      <div className="sm:hidden px-3 py-2 space-y-1.5 border-b border-zinc-900/60">
        {/* Mobile Row 1: Brand & Direct Call / WhatsApp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 cursor-pointer min-w-0" onClick={() => onNavigate('catalogue')}>
            {businessProfile.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt={businessProfile.businessName}
                className="w-10 h-10 rounded-full object-cover border border-[#D4AF37] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-brand-logo text-sm font-bold shrink-0">
                A
              </div>
            )}
            <span className="font-brand-logo font-black text-xs min-[360px]:text-sm sm:text-base tracking-[0.16em] text-white leading-tight uppercase whitespace-normal">
              {businessProfile.businessName}
            </span>
          </div>

          {/* Quick Contact Links on Mobile Top Row */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <a
              id="header-call-link-mobile"
              href={`tel:${businessProfile.contactNumber.replace(/[^0-9+]/g, '')}`}
              className="px-2 py-1 rounded-md bg-[#141414] border border-zinc-800 text-[#D4AF37] text-[10px] font-bold flex items-center space-x-1"
              title="Call Store"
            >
              <Phone className="w-3 h-3 text-[#D4AF37]" />
              <span>Call</span>
            </a>
            <a
              id="header-whatsapp-link-mobile"
              href={`https://wa.me/${businessProfile.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(businessProfile.businessName)}%2C%20I%20have%20an%20enquiry.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-md bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-[10px] font-bold flex items-center space-x-1"
              title="WhatsApp Store"
            >
              <MessageCircle className="w-3 h-3 fill-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Mobile Row 2: Subtitle & Share / Login Buttons */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-[10px] text-[#D4AF37]/90 uppercase tracking-widest font-bold truncate">
            {isAdminView ? 'Catalogue Management' : 'ALL TYPES CLOTHING STORE'}
          </p>

          <div className="flex items-center space-x-1.5 shrink-0">
            {isAdminView ? (
              <>
                <button
                  id="mobile-nav-view-public"
                  onClick={() => onNavigate('catalogue')}
                  className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#141414] border border-[#D4AF37]/40 flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3 text-[#D4AF37]" />
                  <span>Catalogue</span>
                </button>
                <button
                  id="mobile-nav-logout"
                  onClick={onLogout}
                  className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/30 border border-rose-900/50 flex items-center space-x-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                id="nav-share-catalogue"
                onClick={onShare}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#141414] border border-[#D4AF37]/40 flex items-center space-x-1"
              >
                <Share2 className="w-3 h-3 text-[#D4AF37]" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Navbar Row */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => onNavigate('catalogue')}>
            {businessProfile.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt={businessProfile.businessName}
                className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-full object-cover border-2 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)] shrink-0"
              />
            ) : (
              <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-full bg-[#121212] border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-brand-logo text-2xl sm:text-3xl font-bold tracking-tighter shrink-0">
                A
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-2xl font-brand-logo font-black tracking-[0.2em] text-white">
                  {businessProfile.businessName}
                </h1>
                {isAdminView && (
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-[#D4AF37]/20 text-[#F1D77A] rounded border border-[#D4AF37]/40">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#D4AF37]/80 uppercase tracking-widest font-semibold">
                {isAdminView ? 'Catalogue Management' : 'ALL TYPES CLOTHING STORE'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isAdminView ? (
              <>
                <nav className="flex items-center space-x-1 bg-[#121212] p-1 rounded-xl border border-[#D4AF37]/30">
                  <button
                    id="nav-admin-dashboard"
                    onClick={() => onNavigate('admin-dashboard')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      currentView === 'admin-dashboard'
                        ? 'bg-[#D4AF37] text-black shadow-md'
                        : 'text-zinc-300 hover:text-[#D4AF37]'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    id="nav-admin-products"
                    onClick={() => onNavigate('admin-products')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      currentView === 'admin-products'
                        ? 'bg-[#D4AF37] text-black shadow-md'
                        : 'text-zinc-300 hover:text-[#D4AF37]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Products</span>
                  </button>
                  <button
                    id="nav-admin-categories"
                    onClick={() => onNavigate('admin-categories')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      currentView === 'admin-categories'
                        ? 'bg-[#D4AF37] text-black shadow-md'
                        : 'text-zinc-300 hover:text-[#D4AF37]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Categories</span>
                  </button>
                  <button
                    id="nav-admin-settings"
                    onClick={() => onNavigate('admin-settings')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      currentView === 'admin-settings'
                        ? 'bg-[#D4AF37] text-black shadow-md'
                        : 'text-zinc-300 hover:text-[#D4AF37]'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    id="nav-admin-banners"
                    onClick={() => onNavigate('admin-banners')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      currentView === 'admin-banners'
                        ? 'bg-[#D4AF37] text-black shadow-md'
                        : 'text-zinc-300 hover:text-[#D4AF37]'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Banner</span>
                  </button>
                </nav>

                <button
                  id="nav-view-public-catalogue"
                  onClick={() => onNavigate('catalogue')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#D4AF37] bg-[#121212] hover:bg-[#18181B] border border-[#D4AF37]/40 transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#D4AF37]" />
                  <span>Public Catalogue</span>
                </button>

                <button
                  id="nav-admin-logout"
                  onClick={onLogout}
                  title="Sign out of admin"
                  className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/40 border border-rose-900/50 transition-colors flex items-center space-x-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                id="nav-share-catalogue-desktop"
                onClick={onShare}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#D4AF37] bg-[#121212] hover:bg-[#1A1A1A] border border-[#D4AF37]/30 transition-colors"
              >
                <Share2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Admin Navigation Bar */}
      {isAdminView && (
        <div className="md:hidden border-t border-[#D4AF37]/20 bg-[#0B0B0B] px-2 py-2 flex items-center justify-around">
          <button
            id="mobile-nav-dashboard"
            onClick={() => onNavigate('admin-dashboard')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              currentView === 'admin-dashboard' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
          <button
            id="mobile-nav-products"
            onClick={() => onNavigate('admin-products')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              currentView === 'admin-products' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'
            }`}
          >
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            <span>Products</span>
          </button>
          <button
            id="mobile-nav-categories"
            onClick={() => onNavigate('admin-categories')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              currentView === 'admin-categories' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'
            }`}
          >
            <Layers className="w-4 h-4 mb-0.5" />
            <span>Categories</span>
          </button>
          <button
            id="mobile-nav-settings"
            onClick={() => onNavigate('admin-settings')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              currentView === 'admin-settings' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>Settings</span>
          </button>
          <button
            id="mobile-nav-banners"
            onClick={() => onNavigate('admin-banners')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              currentView === 'admin-banners' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-400'
            }`}
          >
            <ImageIcon className="w-4 h-4 mb-0.5" />
            <span>Banner</span>
          </button>
        </div>
      )}
    </header>
  );
};
