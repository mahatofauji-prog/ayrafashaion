import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  getBusinessProfile,
  updateBusinessProfile,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
} from './firebase/services';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './firebase/seed';
import { BusinessProfile, Category, Product } from './types';
import { Navbar } from './components/Navbar';
import { CatalogueView } from './components/public/CatalogueView';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductManagement } from './components/admin/ProductManagement';
import { CategoryManagement } from './components/admin/CategoryManagement';
import { BusinessSettings } from './components/admin/BusinessSettings';
import { ProductFormModal } from './components/admin/ProductFormModal';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';

type ViewMode =
  | 'catalogue'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-categories'
  | 'admin-settings'
  | 'admin-login';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('catalogue');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Data states
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modals & Notifications
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data
  const loadCatalogueData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [profileData, categoriesData, productsData] = await Promise.all([
        getBusinessProfile(),
        getCategories(),
        getProducts(),
      ]);
      const updatedProfile = {
        ...profileData,
        logoUrl: profileData.logoUrl && !profileData.logoUrl.includes('unsplash') ? profileData.logoUrl : '/logo.jpg',
      };
      setBusinessProfile(updatedProfile);
      setCategories(categoriesData);
      setProducts(productsData);
    } catch (err) {
      console.error('Error loading initial catalogue data:', err);
      showToast('Could not sync with Firestore. Using offline mode.', 'info');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCatalogueData();
  }, [loadCatalogueData]);

  // Product CRUD Handlers
  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (
    productData: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (productToEdit) {
      await updateProduct(productToEdit.id, productData);
      showToast('Product updated successfully.', 'success');
    } else {
      await addProduct(productData);
      showToast('Product added successfully.', 'success');
    }
    await loadCatalogueData();
    setIsProductModalOpen(false);
  };

  const handleDeleteProductPrompt = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteProduct(product.id);
          showToast(`Deleted "${product.name}"`, 'success');
          await loadCatalogueData();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          showToast('Failed to delete product: ' + err.message, 'error');
        }
      },
    });
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      const newStatus = await toggleProductAvailability(product.id, product.availability);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, availability: newStatus } : p))
      );
      showToast(
        `"${product.name}" marked as ${newStatus}`,
        newStatus === 'Available' ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Failed to change stock status: ' + err.message, 'error');
    }
  };

  // Category CRUD Handlers
  const handleAddNewCategory = async (name: string, description?: string): Promise<Category> => {
    const newCat = await addCategory(name, description);
    await loadCatalogueData();
    return newCat;
  };

  const handleUpdateCategory = async (id: string, name: string, description?: string) => {
    await updateCategory(id, name, description);
    await loadCatalogueData();
  };

  const handleDeleteCategoryPrompt = (category: Category) => {
    const assignedProducts = products.filter((p) => p.categoryId === category.id);
    if (assignedProducts.length > 0) {
      showToast(
        `Cannot delete "${category.name}": ${assignedProducts.length} product(s) are currently using this category.`,
        'error'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${category.name}"?`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await deleteCategory(category.id);
          if (res.success) {
            showToast(`Deleted category "${category.name}"`, 'success');
            await loadCatalogueData();
          } else {
            showToast(res.message || 'Failed to delete category.', 'error');
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          showToast('Error deleting category: ' + err.message, 'error');
        }
      },
    });
  };

  // Business Profile Settings
  const handleSaveBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    await updateBusinessProfile(updates);
    setBusinessProfile((prev) => ({ ...prev, ...updates }));
    showToast('Business details updated successfully!', 'success');
  };

  // Reset Demo Catalogue
  const handleResetSeedData = async () => {
    // Delete all current products
    for (const p of products) {
      try {
        await deleteProduct(p.id);
      } catch {}
    }
    // Delete all categories
    for (const c of categories) {
      try {
        await deleteCategory(c.id);
      } catch {}
    }
    // Re-seed
    await updateBusinessProfile(DEFAULT_BUSINESS_PROFILE);
    for (const c of INITIAL_CATEGORIES) {
      await addCategory(c.name, c.description);
    }
    for (const p of INITIAL_PRODUCTS) {
      await addProduct({
        name: p.name,
        price: p.price,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        imageUrl: p.imageUrl,
        description: p.description,
        availability: p.availability,
      });
    }
    await loadCatalogueData();
  };

  // Share Catalogue Handler
  const handleShareCatalogue = () => {
    const catalogueUrl = window.location.origin;
    if (navigator.share) {
      navigator
        .share({
          title: `${businessProfile.businessName} - Digital Product Catalogue`,
          text: `Explore the complete clothing catalogue of ${businessProfile.businessName} with direct WhatsApp ordering!`,
          url: catalogueUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(catalogueUrl);
      showToast('Catalogue link copied to clipboard!', 'success');
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await signOut(auth);
    showToast('Signed out of admin portal.', 'info');
    setCurrentView('catalogue');
  };

  // Route protection
  const navigateTo = (view: ViewMode) => {
    if (view.startsWith('admin') && view !== 'admin-login' && !currentUser) {
      setCurrentView('admin-login');
    } else {
      setCurrentView(view);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans text-[#F5F5F5]">
      {/* Universal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        isAuthenticated={!!currentUser}
        onLogout={handleLogout}
        businessProfile={businessProfile}
        onShare={handleShareCatalogue}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {currentView === 'catalogue' && (
          <CatalogueView
            products={products}
            categories={categories}
            businessProfile={businessProfile}
            onShareCatalogue={handleShareCatalogue}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            businessProfile={businessProfile}
            onLoginSuccess={() => setCurrentView('admin-dashboard')}
            onBackToCatalogue={() => setCurrentView('catalogue')}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            products={products}
            categories={categories}
            businessProfile={businessProfile}
            onOpenAddProduct={handleOpenAddProduct}
            onEditProduct={handleOpenEditProduct}
            onToggleAvailability={handleToggleProductAvailability}
            onNavigateToProducts={() => setCurrentView('admin-products')}
            onNavigateToCategories={() => setCurrentView('admin-categories')}
            onViewPublicCatalogue={() => setCurrentView('catalogue')}
            onShareCatalogue={handleShareCatalogue}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-products' && (
          <ProductManagement
            products={products}
            categories={categories}
            onOpenAddProduct={handleOpenAddProduct}
            onEditProduct={handleOpenEditProduct}
            onDeleteProduct={handleDeleteProductPrompt}
            onToggleAvailability={handleToggleProductAvailability}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-categories' && (
          <CategoryManagement
            categories={categories}
            products={products}
            onAddCategory={async (name, desc) => {
              await handleAddNewCategory(name, desc);
            }}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategoryPrompt}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-settings' && (
          <BusinessSettings
            businessProfile={businessProfile}
            onSaveProfile={handleSaveBusinessProfile}
            onResetSeedData={handleResetSeedData}
            onShareCatalogue={handleShareCatalogue}
            onShowToast={showToast}
          />
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        productToEdit={productToEdit}
        categories={categories}
        onSave={handleSaveProduct}
        onClose={() => setIsProductModalOpen(false)}
        onAddNewCategory={async (name) => {
          return await handleAddNewCategory(name);
        }}
        onShowToast={showToast}
      />

      {/* Delete / Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
