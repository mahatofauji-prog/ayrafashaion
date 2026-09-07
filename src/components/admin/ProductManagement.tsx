import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  Eye,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { Product, Category, AvailabilityStatus } from '../../types';

interface ProductManagementProps {
  products: Product[];
  categories: Category[];
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onToggleAvailability: (product: Product) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  categories,
  onOpenAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleAvailability,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filtered and searched products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' || product.categoryId === selectedCategory;

      const matchesAvail =
        selectedAvailability === 'all' || product.availability === selectedAvailability;

      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [products, searchQuery, selectedCategory, selectedAvailability]);

  // Pagination slice
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#050505] text-[#F5F5F5]">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
            Product Management
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
            Manage your store's clothing catalogue ({products.length} total items)
          </p>
        </div>

        <button
          id="product-mgmt-add-btn"
          onClick={onOpenAddProduct}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D0D0D] p-4 rounded-2xl border border-zinc-800 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
            <input
              id="admin-product-search-input"
              type="text"
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <select
              id="admin-category-filter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Availability Filter */}
            <select
              id="admin-availability-filter"
              value={selectedAvailability}
              onChange={(e) => {
                setSelectedAvailability(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center space-x-1 bg-[#141414] p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-[#D4AF37] text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-[#D4AF37] text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product List / Table Display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#0D0D0D] rounded-3xl border border-dashed border-zinc-800 p-12 text-center max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-[#18181B] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-serif font-bold text-white mb-1">
            {products.length === 0 ? 'No products added yet' : 'No products found'}
          </h3>
          <p className="text-xs text-zinc-400 mb-6">
            {products.length === 0
              ? 'Start building your digital catalogue by adding your first clothing item.'
              : 'Try changing your search keywords or filter criteria.'}
          </p>
          {products.length === 0 ? (
            <button
              onClick={onOpenAddProduct}
              className="px-5 py-2.5 bg-[#D4AF37] text-black font-extrabold uppercase tracking-wider rounded-xl text-xs hover:bg-[#C9A227] transition-colors"
            >
              + Add First Product
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedAvailability('all');
              }}
              className="px-4 py-2 bg-[#18181B] text-zinc-300 rounded-xl text-xs font-semibold hover:bg-[#222]"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedProducts.map((product) => {
            const isAvailable = product.availability === 'Available';
            return (
              <div
                key={product.id}
                id={`admin-prod-card-${product.id}`}
                className="bg-[#0D0D0D] rounded-2xl border border-zinc-800 hover:border-[#D4AF37]/60 overflow-hidden shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image and badges */}
                <div className="relative aspect-4/5 w-full bg-[#141414] overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30">
                      {product.categoryName}
                    </span>
                  </div>

                  {/* Availability toggle badge */}
                  <button
                    onClick={() => onToggleAvailability(product)}
                    title="Click to toggle availability"
                    className={`absolute top-2.5 right-2.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md transition-transform active:scale-95 ${
                      isAvailable
                        ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900'
                        : 'bg-rose-950/90 text-rose-400 border border-rose-500/50 hover:bg-rose-900'
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
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-white line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-extrabold text-[#D4AF37]">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onEditProduct(product)}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#18181B] hover:bg-[#222] text-zinc-200 text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product)}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/50 border border-rose-900/40 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-[#0D0D0D] rounded-2xl border border-zinc-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-[#121212] border-b border-zinc-800 text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {paginatedProducts.map((product) => {
                  const isAvailable = product.availability === 'Available';
                  return (
                    <tr key={product.id} className="hover:bg-[#141414] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover bg-[#1A1A1A] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">
                              {product.name}
                            </span>
                            {product.description && (
                              <span className="text-xs text-zinc-400 line-clamp-1">
                                {product.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/30">
                          {product.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-[#D4AF37]">
                        ₹{product.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onToggleAvailability(product)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider transition-colors ${
                            isAvailable
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/50 hover:bg-rose-900'
                          }`}
                        >
                          {isAvailable ? 'Available' : 'Out of Stock'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onEditProduct(product)}
                            className="p-2 text-zinc-400 hover:text-[#D4AF37] hover:bg-[#1A1A1A] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(product)}
                            className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-400 font-medium">
            Page <span className="font-bold text-[#D4AF37]">{currentPage}</span> of{' '}
            <span className="font-bold text-[#D4AF37]">{totalPages}</span> ({filteredProducts.length} items)
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 bg-[#121212] hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 bg-[#121212] hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
