import React, { useState, useMemo } from 'react';
import {
  Search,
  MessageCircle,
  Phone,
  Mail,
  Share2,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  Layers,
  Filter,
} from 'lucide-react';
import { Product, Category, BusinessProfile } from '../../types';

interface CatalogueViewProps {
  products: Product[];
  categories: Category[];
  businessProfile: BusinessProfile;
  onOpenProductDetails?: (product: Product) => void;
  onShareCatalogue: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CatalogueView: React.FC<CatalogueViewProps> = ({
  products,
  categories,
  businessProfile,
  onShareCatalogue,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || product.categoryId === selectedCategory;

      const matchesAvailability =
        availabilityFilter === 'all' || product.availability === 'Available';

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [products, searchQuery, selectedCategory, availabilityFilter]);

  // Helper to format WhatsApp message URL
  const getWhatsAppProductUrl = (product: Product) => {
    const rawNumber = businessProfile.whatsapp.replace(/[^0-9]/g, '');
    const message = `Hello ${businessProfile.businessName}, I am interested in ${product.name} priced at ₹${product.price}. Please provide more details.`;
    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleShareProduct = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator
        .share({
          title: `${product.name} - ${businessProfile.businessName}`,
          text: `Check out ${product.name} for ₹${product.price} at ${businessProfile.businessName}!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `${product.name} (₹${product.price}) - ${businessProfile.businessName}\n${window.location.href}`
      );
      onShowToast('Product link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] pb-24">
      {/* Top Banner / Store Hero Header */}
      <section className="relative w-full bg-[#0B0B0B] border-b border-[#D4AF37]/30 overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[28px] pb-7 sm:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 sm:gap-5">
              {businessProfile.logoUrl && (
                <img
                  src={businessProfile.logoUrl}
                  alt={businessProfile.businessName}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] shrink-0"
                />
              )}
              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#161616] border border-[#D4AF37]/40 text-[#F1D77A] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>OFFICIAL LUXURY CATALOGUE</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-black tracking-wider text-white">
                  {businessProfile.businessName}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-[#D4AF37] font-semibold tracking-widest uppercase">
                  PREMIUM FASHION • TIMELESS STYLE
                </p>
              </div>
            </div>

            {/* Direct Contact Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <a
                id="hero-whatsapp-btn"
                href={`https://wa.me/${businessProfile.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(businessProfile.businessName)}%2C%20I%20am%20browsing%20your%20catalogue.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] active:bg-[#B8921A] text-black font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-[#D4AF37]/15 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                <span>WhatsApp: {businessProfile.whatsapp}</span>
              </a>

              <a
                id="hero-call-btn"
                href={`tel:${businessProfile.contactNumber.replace(/[^0-9+]/g, '')}`}
                className="flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] text-zinc-200 font-bold uppercase tracking-wider border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors text-xs"
              >
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                <span>Call Us</span>
              </a>

              <button
                id="hero-share-catalogue-btn"
                onClick={onShareCatalogue}
                className="flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] text-zinc-200 font-bold uppercase tracking-wider border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors text-xs"
              >
                <Share2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Decorative Divider Line */}
          <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs text-zinc-400 text-center sm:text-left">
            <div className="flex items-center space-x-2">
              <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-zinc-300 font-mono text-[11px] sm:text-xs">{businessProfile.email}</span>
            </div>
            <div className="text-zinc-400 text-[11px] sm:text-xs font-medium">
              Browse collection below & click WhatsApp for direct orders.
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Category Navigation */}
        <div className="space-y-5 mb-8">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
            <input
              id="catalogue-search-input"
              type="text"
              placeholder="Search by name, shirt, saree, dress, jeans, men, women..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-[#121212] rounded-2xl border border-zinc-800 shadow-inner text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
              <button
                id="cat-pill-all"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                    : 'bg-[#121212] text-zinc-300 hover:text-white hover:bg-[#18181B] border border-zinc-800'
                }`}
              >
                ALL ({products.length})
              </button>

              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    id={`cat-pill-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                        : 'bg-[#121212] text-zinc-300 hover:text-white hover:bg-[#18181B] border border-zinc-800'
                    }`}
                  >
                    {cat.name.toUpperCase()} ({count})
                  </button>
                );
              })}
            </div>

            {/* In-Stock Filter Toggle */}
            <div className="flex items-center space-x-2 bg-[#121212] px-3.5 py-2 rounded-xl border border-zinc-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
              <label className="text-zinc-300 cursor-pointer font-semibold uppercase tracking-wider select-none flex items-center space-x-2 text-[11px]">
                <input
                  id="filter-available-only"
                  type="checkbox"
                  checked={availabilityFilter === 'available'}
                  onChange={(e) => setAvailabilityFilter(e.target.checked ? 'available' : 'all')}
                  className="rounded bg-zinc-900 border-zinc-700 text-[#D4AF37] focus:ring-[#D4AF37] w-4 h-4 cursor-pointer"
                />
                <span>Available only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Count Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
            Showing <span className="font-extrabold text-[#D4AF37]">{filteredProducts.length}</span> product
            {filteredProducts.length === 1 ? '' : 's'}
            {selectedCategory !== 'all' && (
              <span> in <strong className="text-white">{categories.find((c) => c.id === selectedCategory)?.name || 'Category'}</strong></span>
            )}
          </p>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 ? (
          <div
            id="catalogue-empty-state"
            className="bg-[#0E0E0E] rounded-3xl border border-dashed border-zinc-800 p-12 text-center max-w-md mx-auto my-12"
          >
            <div className="w-16 h-16 rounded-full bg-[#18181B] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-1">No products found</h3>
            <p className="text-xs text-zinc-400 mb-6">
              {searchQuery
                ? `No items matched "${searchQuery}". Try another search keyword.`
                : 'No products currently listed in this category.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setAvailabilityFilter('all');
              }}
              className="px-5 py-2.5 bg-[#D4AF37] text-black font-bold uppercase tracking-wider rounded-xl text-xs hover:bg-[#C9A227] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Product Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => {
              const isAvailable = product.availability === 'Available';
              const whatsappUrl = getWhatsAppProductUrl(product);

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-[#0D0D0D] rounded-2xl border border-zinc-800/90 hover:border-[#D4AF37]/60 overflow-hidden shadow-md hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all duration-300 flex flex-col cursor-pointer"
                >
                  {/* Product Image Container */}
                  <div className="relative aspect-4/5 w-full bg-[#141414] overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category Tag */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30">
                        {product.categoryName}
                      </span>
                    </div>

                    {/* Availability Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md ${
                          isAvailable
                            ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/50'
                            : 'bg-rose-950/90 text-rose-400 border border-rose-500/50'
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>AVAILABLE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-2.5 h-2.5" />
                            <span>OUT OF STOCK</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Quick Share Button */}
                    <button
                      onClick={(e) => handleShareProduct(product, e)}
                      title="Share product"
                      className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/80 backdrop-blur-md text-zinc-300 hover:text-[#D4AF37] border border-zinc-700 flex items-center justify-center shadow-md transition-transform hover:scale-110"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-sm sm:text-base text-white group-hover:text-[#F1D77A] transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-1 text-[11px] sm:text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Price</span>
                        <span className="text-base sm:text-xl font-extrabold text-[#D4AF37]">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Primary WhatsApp Enquiry Button */}
                      <a
                        id={`whatsapp-btn-${product.id}`}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#D4AF37] hover:bg-[#C9A227] text-black text-[11px] sm:text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all"
                      >
                        <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black" />
                        <span>Enquire</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          id="product-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-[#0D0D0D] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#D4AF37]/30 transition-all transform scale-100 max-h-[90vh] flex flex-col md:flex-row text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image */}
            <div className="md:w-1/2 aspect-4/5 md:aspect-auto bg-[#141414] relative overflow-hidden shrink-0">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProduct(null)}
                className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Details & Action */}
            <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#0D0D0D]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/30">
                    {selectedProduct.categoryName}
                  </span>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="hidden md:flex text-zinc-400 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-black text-white mt-2">
                  {selectedProduct.name}
                </h2>

                <div className="mt-4 flex items-baseline space-x-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#D4AF37]">
                    ₹{selectedProduct.price.toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      selectedProduct.availability === 'Available'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                        : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                    }`}
                  >
                    {selectedProduct.availability === 'Available' ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedProduct.availability}</span>
                  </span>
                </div>

                <div className="mt-6">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">
                    Product Description
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {selectedProduct.description ||
                      'Exclusive clothing item from AYRA FASHION collection. Contact us on WhatsApp for size options, fabric details, and fast delivery.'}
                  </p>
                </div>

                <div className="mt-6 p-3.5 rounded-2xl bg-[#141414] border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  <div className="font-bold text-[#D4AF37] uppercase tracking-wider text-[11px]">AYRA FASHION Store:</div>
                  <div>WhatsApp: {businessProfile.whatsapp}</div>
                  <div>Call: {businessProfile.contactNumber}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-4 border-t border-zinc-800 space-y-2.5">
                <a
                  id="modal-whatsapp-enquire-btn"
                  href={getWhatsAppProductUrl(selectedProduct)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-[#D4AF37]/20 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>ENQUIRE ON WHATSAPP</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    id="modal-call-btn"
                    href={`tel:${businessProfile.contactNumber.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-zinc-800 bg-[#121212] text-zinc-200 hover:text-white hover:border-[#D4AF37]/40 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Call Store</span>
                  </a>

                  <button
                    id="modal-share-btn"
                    onClick={(e) => handleShareProduct(selectedProduct, e)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-zinc-800 bg-[#121212] text-zinc-200 hover:text-white hover:border-[#D4AF37]/40 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Share Item</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <a
        id="floating-whatsapp-btn"
        href={`https://wa.me/${businessProfile.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(businessProfile.businessName)}%2C%20I%20have%20an%20enquiry%20regarding%20clothing%20products.`}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with AYRA FASHION on WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 bg-[#D4AF37] hover:bg-[#C9A227] text-black font-extrabold uppercase tracking-wider rounded-full shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all duration-300 hover:scale-105"
      >
        <MessageCircle className="w-6 h-6 fill-black" />
        <span className="text-xs font-extrabold pr-1 hidden sm:inline">WhatsApp</span>
      </a>

      {/* Minimal Luxury Footer */}
      <footer className="mt-20 border-t border-[#D4AF37]/20 bg-[#070707] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div>
            <h3 className="font-serif font-black text-xl text-white tracking-wider">
              {businessProfile.businessName}
            </h3>
            <p className="text-xs text-[#D4AF37] font-semibold tracking-widest uppercase mt-1">
              {businessProfile.businessType}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 text-xs text-zinc-400">
            <div>
              <span className="text-[#D4AF37] font-bold block mb-0.5">WhatsApp Orders</span>
              <span className="text-white font-mono">{businessProfile.whatsapp}</span>
            </div>
            <div>
              <span className="text-[#D4AF37] font-bold block mb-0.5">Contact</span>
              <span className="text-white font-mono">{businessProfile.contactNumber}</span>
            </div>
            <div>
              <span className="text-[#D4AF37] font-bold block mb-0.5">Email</span>
              <span className="text-white font-mono">{businessProfile.email}</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-zinc-900 text-center text-[11px] text-zinc-600">
          © {new Date().getFullYear()} {businessProfile.businessName}. All rights reserved. Premium Digital Catalogue Software.
        </div>
      </footer>
    </div>
  );
};
