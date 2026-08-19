import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, AlertCircle, Check, X, FolderPlus } from 'lucide-react';
import { Category, Product } from '../../types';

interface CategoryManagementProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (name: string, description?: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, description?: string) => Promise<void>;
  onDeleteCategory: (category: Category) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onShowToast,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    setIsAdding(true);
    setErrorMsg('');
    try {
      await onAddCategory(newCatName.trim(), newCatDesc.trim());
      setNewCatName('');
      setNewCatDesc('');
      setIsAddModalOpen(false);
      onShowToast(`Category "${newCatName}" created successfully!`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add category.');
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setErrorMsg('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    try {
      await onUpdateCategory(id, editName.trim(), editDesc.trim());
      setEditingCatId(null);
      onShowToast('Category updated successfully!', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update category.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#050505] text-[#F5F5F5]">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
            Categories Management
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
            Organize your clothing catalog into easy-to-browse product categories ({categories.length} total)
          </p>
        </div>

        <button
          id="open-add-category-modal-btn"
          onClick={() => {
            setErrorMsg('');
            setNewCatName('');
            setNewCatDesc('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Category</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-[#0D0D0D] rounded-2xl border border-zinc-800 overflow-hidden shadow-md">
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <span>All Categories ({categories.length})</span>
          </h3>
          <span className="text-xs text-zinc-400 font-medium">
            Active clothing categories
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm flex flex-col items-center">
            <FolderPlus className="w-10 h-10 text-[#D4AF37] mb-3 opacity-60" />
            <p className="font-semibold text-white mb-1">No categories added yet</p>
            <p className="text-xs text-zinc-400 mb-4">Click below to create your first category.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider"
            >
              + Add First Category
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {categories.map((category) => {
              const productCount = products.filter((p) => p.categoryId === category.id).length;
              const isEditing = editingCatId === category.id;

              return (
                <div
                  key={category.id}
                  id={`cat-item-${category.id}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#121212] transition-colors"
                >
                  {isEditing ? (
                    // Edit Mode
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-2 bg-[#141414] border border-[#D4AF37] rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none"
                        placeholder="Category Name"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="px-3 py-2 bg-[#141414] border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-[#D4AF37]"
                        placeholder="Description (optional)"
                      />
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-base font-serif font-bold text-white">
                          {category.name}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-[#18181B] text-[#D4AF37] border border-[#D4AF37]/30">
                          {productCount} product{productCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      {category.description && (
                        <p className="mt-1 text-xs text-zinc-400">{category.description}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(category.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(category)}
                          className="p-2 text-zinc-400 hover:text-[#D4AF37] hover:bg-[#18181B] rounded-lg transition-colors"
                          title="Rename Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteCategory(category)}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Small Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D0D0D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D4AF37]/40 text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-serif font-black text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-[#D4AF37]" />
                <span>Add Category</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="modal-category-name-input"
                  type="text"
                  required
                  placeholder="e.g. Sarees, Dresses, Kurtas"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <input
                  id="modal-category-desc-input"
                  type="text"
                  placeholder="e.g. Traditional and ethnic sarees collection"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#141414] border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-[#1A1A1A]"
                >
                  Cancel
                </button>
                <button
                  id="modal-save-category-btn"
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-extrabold uppercase tracking-wider shadow-md"
                >
                  {isAdding ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

