import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle,
  Plus,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Product, Category, AvailabilityStatus } from '../../types';
import { uploadProductImage } from '../../firebase/services';

interface ProductFormModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  categories: Category[];
  onSave: (productData: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  onAddNewCategory: (name: string) => Promise<Category>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const PRESET_IMAGES = [
  { name: 'Shirt', url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80' },
  { name: 'Dress', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80' },
  { name: 'Jeans', url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80' },
  { name: 'Saree', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80' },
  { name: 'T-Shirt', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80' },
  { name: 'Kids Wear', url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&auto=format&fit=crop&q=80' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  productToEdit,
  categories,
  onSave,
  onClose,
  onAddNewCategory,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | string>('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>('Available');
  const [imageUrl, setImageUrl] = useState('');
  
  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New category inline modal
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Populate form when editing or opening
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price);
      setCategoryId(productToEdit.categoryId);
      setDescription(productToEdit.description || '');
      setAvailability(productToEdit.availability);
      setImageUrl(productToEdit.imageUrl);
    } else {
      setName('');
      setPrice('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setDescription('');
      setAvailability('Available');
      setImageUrl(PRESET_IMAGES[0].url);
    }
    setImageFile(null);
    setUploadProgress(0);
    setFormError('');
  }, [productToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, JPEG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormError('Please select a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size exceeds 10MB. Please choose a smaller photo.');
      return;
    }

    setFormError('');
    setImageFile(file);
    setIsUploadingImage(true);
    setUploadProgress(10);

    try {
      const uploadedUrl = await uploadProductImage(file, (progress) => {
        setUploadProgress(progress);
      });
      setImageUrl(uploadedUrl);
      onShowToast('Product image processed successfully!', 'success');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setFormError('Failed to process image. Please try another image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateInlineCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const newCat = await onAddNewCategory(newCatName.trim());
      setCategoryId(newCat.id);
      setNewCatName('');
      setShowNewCatInput(false);
      onShowToast(`Category "${newCat.name}" created!`, 'success');
    } catch (err) {
      setFormError('Failed to create new category.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Data validation
    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Please enter a valid price (greater than or equal to 0).');
      return;
    }

    if (!categoryId) {
      setFormError('Please select a category.');
      return;
    }

    if (!imageUrl) {
      setFormError('Please provide or upload a product image.');
      return;
    }

    const selectedCategoryObj = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategoryObj ? selectedCategoryObj.name : 'General';

    setIsSaving(true);
    setFormError('');

    try {
      await onSave({
        name: name.trim(),
        price: numPrice,
        categoryId,
        categoryName,
        imageUrl,
        description: description.trim(),
        availability,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setFormError(err.message || 'Failed to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="product-form-modal"
        className="bg-[#0D0D0D] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#D4AF37]/40 text-white overflow-y-auto max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-serif font-black text-white">
              {productToEdit ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-[#D4AF37] font-semibold tracking-wider uppercase mt-0.5">
              AYRA FASHION Product Catalogue
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Image Upload & Preview Section */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
              Product Image <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              {/* Preview Box */}
              <div className="relative aspect-4/5 w-full bg-[#141414] rounded-2xl border border-zinc-800 overflow-hidden group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                    <ImageIcon className="w-8 h-8 mb-2 text-[#D4AF37]" />
                    <span className="text-xs">No image selected</span>
                  </div>
                )}

                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-white">
                    <div className="w-full bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="bg-[#D4AF37] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-[#F1D77A]">{uploadProgress}% Uploading</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Presets */}
              <div className="sm:col-span-2 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-[#D4AF37]/60 bg-[#121212] hover:bg-[#18181B] rounded-2xl p-4 text-center cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-6 h-6 mx-auto text-[#D4AF37] mb-1" />
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Click to upload from device
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    JPG, JPEG, PNG, or WebP (Auto-optimized)
                  </p>
                </div>

                {/* Quick Presets Picker */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Or select sample clothing photo:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[11px] font-bold py-1 px-2 rounded-lg border text-center transition-all truncate uppercase tracking-wider ${
                          imageUrl === preset.url
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#141414] text-zinc-300 border-zinc-800 hover:bg-[#1A1A1A]'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="url"
                    placeholder="Or paste direct image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="product-name-input"
              type="text"
              required
              placeholder="e.g. Premium Cotton Shirt, Designer Silk Saree"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37] transition-all"
            />
          </div>

          {/* Price & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
                Price (INR ₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#D4AF37]">
                  ₹
                </span>
                <input
                  id="product-price-input"
                  type="number"
                  required
                  min="0"
                  step="1"
                  placeholder="799"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="text-xs text-[#F1D77A] hover:underline font-semibold flex items-center space-x-1 uppercase tracking-wider text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>New Category</span>
                </button>
              </div>

              {showNewCatInput ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#141414] border border-[#D4AF37] rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineCategory}
                    className="px-3 py-2 bg-[#D4AF37] hover:bg-[#C9A227] text-black rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(false)}
                    className="px-2 py-2 text-zinc-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  id="product-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                >
                  <option value="" disabled>
                    Select category...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              id="product-description-input"
              rows={3}
              placeholder="e.g. 100% pure combed cotton casual shirt with spread collar. Available in sizes M, L, XL."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37] transition-all"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
              Availability Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="avail-btn-available"
                onClick={() => setAvailability('Available')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  availability === 'Available'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                    : 'bg-[#141414] border-zinc-800 text-zinc-400 hover:bg-[#1A1A1A]'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Available</span>
              </button>

              <button
                type="button"
                id="avail-btn-outofstock"
                onClick={() => setAvailability('Out of Stock')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  availability === 'Out of Stock'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-400'
                    : 'bg-[#141414] border-zinc-800 text-zinc-400 hover:bg-[#1A1A1A]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Out of Stock</span>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>

            <button
              id="product-save-btn"
              type="submit"
              disabled={isSaving || isUploadingImage}
              className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all flex items-center space-x-2"
            >
              {isSaving ? (
                <span>Saving Product...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{productToEdit ? 'Save Changes' : 'Add Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
