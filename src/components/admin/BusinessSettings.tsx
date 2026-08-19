import React, { useState } from 'react';
import {
  Building2,
  Phone,
  MessageCircle,
  Mail,
  Share2,
  Copy,
  Check,
  Save,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { BusinessProfile } from '../../types';

interface BusinessSettingsProps {
  businessProfile: BusinessProfile;
  onSaveProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  onShareCatalogue: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({
  businessProfile,
  onSaveProfile,
  onResetSeedData,
  onShareCatalogue,
  onShowToast,
}) => {
  const [businessName, setBusinessName] = useState(businessProfile.businessName);
  const [businessType, setBusinessType] = useState(businessProfile.businessType);
  const [email, setEmail] = useState(businessProfile.email);
  const [whatsapp, setWhatsapp] = useState(businessProfile.whatsapp);
  const [contactNumber, setContactNumber] = useState(businessProfile.contactNumber);
  const [catalogueSlug, setCatalogueSlug] = useState(businessProfile.catalogueSlug);
  const [logoUrl, setLogoUrl] = useState(businessProfile.logoUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        businessName: businessName.trim(),
        businessType: businessType.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        contactNumber: contactNumber.trim(),
        catalogueSlug: catalogueSlug.trim(),
        logoUrl: logoUrl.trim(),
      });
      onShowToast('Business profile updated successfully!', 'success');
    } catch (err: any) {
      onShowToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.origin;
    navigator.clipboard.writeText(fullUrl);
    onShowToast('Catalogue link copied to clipboard!', 'success');
  };

  const handleResetData = async () => {
    if (window.confirm('Reset catalogue with fresh demo products and categories?')) {
      setIsResetting(true);
      try {
        await onResetSeedData();
        onShowToast('Demo clothing catalogue restored!', 'success');
      } catch (err) {
        onShowToast('Failed to restore demo data', 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#050505] text-[#F5F5F5]">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
          Business Profile & Settings
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
          Manage your store contact numbers, WhatsApp redirection, and catalogue details
        </p>
      </div>

      {/* Public Link Share Box */}
      <div className="bg-[#0D0D0D] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#D4AF37]/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
              Live Public Catalogue
            </span>
            <h3 className="text-xl font-serif font-bold text-white mt-1">
              {businessName} Digital Catalogue Link
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Share this link with customers on WhatsApp, Instagram, SMS, or QR codes.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black hover:bg-[#C9A227] text-xs font-extrabold uppercase tracking-wider transition-all shadow-md"
            >
              <Copy className="w-4 h-4 text-black" />
              <span>Copy Link</span>
            </button>

            <button
              onClick={onShareCatalogue}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#222] text-white text-xs font-extrabold uppercase tracking-wider transition-all border border-zinc-800"
            >
              <Share2 className="w-4 h-4 text-[#D4AF37]" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-md space-y-6">
        <h3 className="text-lg font-serif font-black text-white pb-4 border-b border-zinc-800 flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-[#D4AF37]" />
          <span>Store Information</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Business Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Business Type / Tagline */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Business Type / Store Tagline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. All Types Clothing Store"
              className="w-full px-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              WhatsApp Number (with Country Code) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 91275 86750"
                className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm font-mono font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Customer enquiries will be directed to this WhatsApp number automatically.
            </p>
          </div>

          {/* Contact Phone Number */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Contact Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 60036 60069"
                className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm font-mono font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Store Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ayra.fashion.assam@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Catalogue Slug */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Catalogue URL Slug
            </label>
            <input
              type="text"
              value={catalogueSlug}
              onChange={(e) => setCatalogueSlug(e.target.value)}
              placeholder="ayra-fashion"
              className="w-full px-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetData}
            disabled={isResetting}
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-[#D4AF37]' : ''}`} />
            <span>Reset Demo Catalogue Data</span>
          </button>

          <button
            id="save-settings-btn"
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
