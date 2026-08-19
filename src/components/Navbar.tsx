import React from 'react';
import {
  ShoppingBag,
  LayoutDashboard,
  Layers,
  Settings,
  Eye,
  LogOut,
  LogIn,
  Share2,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface NavbarProps {
  currentView: 'catalogue' | 'admin-dashboard' | 'admin-products' | 'admin-categories' | 'admin-settings' | 'admin-login';
  onNavigate: (view: 'catalogue' | 'admin-dashboard' | 'admin-products' | 'admin-categories' | 'admin-settings' | 'admin-login') => void;
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
    <header className="sticky top-0 z-40 bg-[#0B0B0B]/95 backdrop-blur-md border-b border-[#D4AF37]/30 transition-all">
      {/* Top Announcement & Quick Contact Bar */}
      <div className="bg-[#050505] text-zinc-300 text-xs py-1.5 px-4 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            <span className="font-serif font-bold text-white tracking-wide">{businessProfile.businessName}</span>
            <span className="hidden sm:inline text-zinc-400">• {businessProfile.businessType}</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              id="header-call-link"
              href={`tel:${businessProfile.contactNumber.replace(/[^0-9+]/g, '')}`}
              className="flex items-center space-x-1.5 text-zinc-300 hover:text-[#D4AF37] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden md:inline font-mono">{businessProfile.contactNumber}</span>
              <span className="md:hidden">Call</span>
            </a>
            <a
              id="header-whatsapp-link"
              href={`https://wa.me/${businessProfile.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(businessProfile.businessName)}%2C%20I%20have%20an%20enquiry.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">WhatsApp Order</span>
              <span className="md:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('catalogue')}>
            {businessProfile.logoUrl ? (
              <img
                src={businessProfile.logoUrl}
                alt={businessProfile.businessName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#121212] border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-serif text-xl sm:text-2xl font-bold tracking-tighter shrink-0">
                A
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-2xl font-serif font-black tracking-wider text-white">
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
              // Admin Navigation
              <>
                <nav className="hidden md:flex items-center space-x-1 bg-[#121212] p-1 rounded-xl border border-[#D4AF37]/30">
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
                </nav>

                <button
                  id="nav-view-public-catalogue"
                  onClick={() => onNavigate('catalogue')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#D4AF37] bg-[#121212] hover:bg-[#18181B] border border-[#D4AF37]/40 transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Public Catalogue</span>
                  <span className="sm:hidden">Catalogue</span>
                </button>

                <button
                  id="nav-admin-logout"
                  onClick={onLogout}
                  title="Sign out of admin"
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-950/40 border border-rose-900/50 transition-colors flex items-center space-x-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              // Public Catalogue Navigation
              <>
                <button
                  id="nav-share-catalogue"
                  onClick={onShare}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#D4AF37] bg-[#121212] hover:bg-[#1A1A1A] border border-[#D4AF37]/30 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                {isAuthenticated ? (
                  <button
                    id="nav-goto-dashboard"
                    onClick={() => onNavigate('admin-dashboard')}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider text-black bg-[#D4AF37] hover:bg-[#C9A227] transition-all shadow-md"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                ) : (
                  <button
                    id="nav-owner-login"
                    onClick={() => onNavigate('admin-login')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white border border-zinc-700 hover:border-[#D4AF37]/50 hover:bg-[#121212] transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Owner Login</span>
                    <span className="sm:hidden">Login</span>
                  </button>
                )}
              </>
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
        </div>
      )}
    </header>
  );
};
