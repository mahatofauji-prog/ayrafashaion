import React from 'react';
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Eye,
  Share2,
  Copy,
  ArrowUpRight,
  TrendingUp,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { Product, Category, BusinessProfile } from '../../types';

interface AdminDashboardProps {
  products: Product[];
  categories: Category[];
  businessProfile: BusinessProfile;
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  onNavigateToProducts: () => void;
  onNavigateToCategories: () => void;
  onViewPublicCatalogue: () => void;
  onShareCatalogue: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  categories,
  businessProfile,
  onOpenAddProduct,
  onEditProduct,
  onToggleAvailability,
  onNavigateToProducts,
  onNavigateToCategories,
  onViewPublicCatalogue,
  onShareCatalogue,
  onShowToast,
}) => {
  // Compute Stats
  const totalProducts = products.length;
  const availableProducts = products.filter((p) => p.availability === 'Available').length;
  const outOfStockProducts = totalProducts - availableProducts;
  const totalCategories = categories.length;

  const handleCopyLink = () => {
    const catalogueUrl = window.location.origin;
    navigator.clipboard.writeText(catalogueUrl);
    onShowToast('Public catalogue link copied to clipboard!', 'success');
  };

  const recentProducts = products.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#050505] text-[#F5F5F5]">
      {/* Top Banner / Welcome */}
      <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">
            <span>Catalogue Dashboard</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Firestore Synced</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
            {businessProfile.businessName}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
            Product Catalogue Manager & WhatsApp Order Software
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            id="dashboard-add-product-btn"
            onClick={onOpenAddProduct}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Product</span>
          </button>

          <button
            id="dashboard-view-catalogue-btn"
            onClick={onViewPublicCatalogue}
            className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-zinc-200 text-xs font-bold uppercase tracking-wider border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors"
          >
            <Eye className="w-4 h-4 text-[#D4AF37]" />
            <span>View Public Catalogue</span>
          </button>

          <button
            id="dashboard-copy-link-btn"
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-zinc-200 text-xs font-bold uppercase tracking-wider border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors"
            title="Copy Public Link"
          >
            <Copy className="w-4 h-4 text-[#D4AF37]" />
            <span>Copy Link</span>
          </button>

          <button
            id="dashboard-share-link-btn"
            onClick={onShareCatalogue}
            className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-zinc-200 text-xs font-bold uppercase tracking-wider border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors"
            title="Share Catalogue"
          >
            <Share2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Dashboard Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* TOTAL PRODUCTS */}
        <div
          id="stat-total-products"
          onClick={onNavigateToProducts}
          className="bg-[#0D0D0D] rounded-2xl p-6 border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              Total Products
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {totalProducts}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400 flex items-center space-x-1">
            <span>Unlimited capacity</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
          </p>
        </div>

        {/* AVAILABLE */}
        <div
          id="stat-available-products"
          onClick={onNavigateToProducts}
          className="bg-[#0D0D0D] rounded-2xl p-6 border border-emerald-900/50 hover:border-emerald-500/60 shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Available
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {availableProducts}
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-400 font-medium">
            Live on WhatsApp catalogue
          </p>
        </div>

        {/* OUT OF STOCK */}
        <div
          id="stat-outofstock-products"
          onClick={onNavigateToProducts}
          className="bg-[#0D0D0D] rounded-2xl p-6 border border-rose-900/50 hover:border-rose-500/60 shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Out of Stock
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {outOfStockProducts}
            </span>
          </div>
          <p className="mt-2 text-xs text-rose-400 font-medium">
            Marked unavailable
          </p>
        </div>

        {/* CATEGORIES */}
        <div
          id="stat-total-categories"
          onClick={onNavigateToCategories}
          className="bg-[#0D0D0D] rounded-2xl p-6 border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
              Categories
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">
              {totalCategories}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400 flex items-center space-x-1">
            <span>Organized collections</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
          </p>
        </div>
      </div>

      {/* Recent Products Overview */}
      <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-black text-white">
              Recently Added Products
            </h3>
            <p className="text-xs text-zinc-400">
              Quick stock availability toggles & preview
            </p>
          </div>
          <button
            onClick={onNavigateToProducts}
            className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:text-[#F1D77A] flex items-center space-x-1"
          >
            <span>View All ({totalProducts})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {recentProducts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400 mb-3">No products in catalogue yet.</p>
            <button
              onClick={onOpenAddProduct}
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-xs font-extrabold uppercase tracking-wider"
            >
              + Add First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProducts.map((product) => {
              const isAvailable = product.availability === 'Available';
              return (
                <div
                  key={product.id}
                  className="flex items-center space-x-3.5 p-3 rounded-2xl bg-[#121212] border border-zinc-800 hover:border-[#D4AF37]/50 transition-all group"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#1A1A1A]"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {product.name}
                    </h4>
                    <p className="text-xs text-zinc-400">{product.categoryName}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#D4AF37]">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => onToggleAvailability(product)}
                        title="Click to toggle availability"
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
                          isAvailable
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/50 hover:bg-rose-900'
                        }`}
                      >
                        {isAvailable ? 'Available' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => onEditProduct(product)}
                    className="p-2 text-zinc-400 hover:text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit product"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
