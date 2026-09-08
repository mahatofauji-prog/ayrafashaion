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
  getAdvertisementBanners,
  deleteAdvertisementBanner,
  isDatabaseQuotaExceeded,
  onQuotaStatusChange,
  reconnectAllListeners,
  subscribeToProducts,
  subscribeToBanners,
  subscribeToCategories,
  subscribeToBusinessProfile,
} from './firebase/services';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './firebase/seed';
import { BusinessProfile, Category, Product, AdvertisementBanner, AvailabilityStatus } from './types';
import { Navbar } from './components/Navbar';
import { CatalogueView } from './components/public/CatalogueView';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductManagement } from './components/admin/ProductManagement';
import { CategoryManagement } from './components/admin/CategoryManagement';
import { BusinessSettings } from './components/admin/BusinessSettings';
import { BannerManagement } from './components/admin/BannerManagement';
import { ProductFormModal } from './components/admin/ProductFormModal';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';

type ViewMode =
  | 'catalogue'
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-categories'
  | 'admin-settings'
  | 'admin-banners'
  | 'admin-login';

const getCachedData = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`ayra_cache_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setCachedData = (key: string, value: any) => {
  try {
    localStorage.setItem(`ayra_cache_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to save cache:', err);
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('catalogue');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Data states
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() =>
    getCachedData<BusinessProfile>('profile', DEFAULT_BUSINESS_PROFILE)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    getCachedData<Category[]>('categories', INITIAL_CATEGORIES.map(c => ({ ...c, createdAt: '', updatedAt: '' })))
  );
  const [products, setProducts] = useState<Product[]>(() =>
    getCachedData<Product[]>('products', INITIAL_PRODUCTS.map(p => ({ ...p, createdAt: '', updatedAt: '' })))
  );
  const [banners, setBanners] = useState<AdvertisementBanner[]>(() =>
    getCachedData<AdvertisementBanner[]>('banners', [])
  );
  const [isLoadingData, setIsLoadingData] = useState(() => {
    try {
      const hasCachedProducts = localStorage.getItem('ayra_cache_products');
      return !hasCachedProducts;
    } catch {
      return true;
    }
  });
  const [hasError, setHasError] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

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
      if (user) {
        localStorage.setItem('ayra_admin_session', 'true');
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Persistent Auth Session Check
  const checkIsAdminAuthenticated = useCallback(() => {
    return Boolean(
      currentUser || auth.currentUser || localStorage.getItem('ayra_admin_session') === 'true'
    );
  }, [currentUser]);

  // Automatically listen to quota status changes across all collection listeners
  useEffect(() => {
    return onQuotaStatusChange((exceeded) => {
      setIsQuotaExceeded(exceeded);
    });
  }, []);

  // Manual refresh / retry handler
  const loadCatalogueData = useCallback(async (forceLoading = false) => {
    let hasCache = false;
    try {
      hasCache = Boolean(localStorage.getItem('ayra_cache_products'));
    } catch {}

    if (!hasCache || forceLoading) {
      setIsLoadingData(true);
    }
    setHasError(false);
    try {
      if (forceLoading) {
        reconnectAllListeners();
      }
      const [profileData, categoriesData, productsData, bannersData] = await Promise.all([
        getBusinessProfile(forceLoading),
        getCategories(forceLoading),
        getProducts(forceLoading),
        getAdvertisementBanners(forceLoading),
      ]);
      const updatedProfile = {
        ...profileData,
        logoUrl: profileData.logoUrl || '/logo.jpg',
      };
      setBusinessProfile(updatedProfile);
      setCategories(categoriesData);
      setProducts(productsData);
      setBanners(bannersData);

      // Save to cache for offline fallback
      setCachedData('profile', updatedProfile);
      setCachedData('categories', categoriesData);
      setCachedData('banners', bannersData);
      if (!isDatabaseQuotaExceeded || !hasCache) {
        setCachedData('products', productsData);
      }
    } catch (err) {
      console.error('Error refreshing catalogue data:', err);
      const errStr = String(err instanceof Error ? err.message : err);
      if (
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('resource_exhausted') ||
        errStr.toLowerCase().includes('resource-exhausted')
      ) {
        setIsQuotaExceeded(true);
      }
      if (!hasCache) {
        setHasError(true);
      }
      showToast('Could not sync with server. Operating in offline mode.', 'info');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  // Centralized real-time Firestore synchronization across all views and devices
  useEffect(() => {
    const unsubProducts = subscribeToProducts(
      (liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          setProducts(liveProducts);
          setCachedData('products', liveProducts);
        }
        setIsLoadingData(false);
      },
      (error) => {
        const errStr = String(error?.message || error);
        if (
          errStr.toLowerCase().includes('quota') ||
          errStr.toLowerCase().includes('resource_exhausted') ||
          errStr.toLowerCase().includes('resource-exhausted')
        ) {
          setIsQuotaExceeded(true);
        }
        setIsLoadingData(false);
      }
    );

    const unsubBanners = subscribeToBanners((liveBanners) => {
      setBanners(liveBanners);
      setCachedData('banners', liveBanners);
    });

    const unsubCategories = subscribeToCategories((liveCategories) => {
      if (liveCategories && liveCategories.length > 0) {
        setCategories(liveCategories);
        setCachedData('categories', liveCategories);
      }
    });

    const unsubProfile = subscribeToBusinessProfile((liveProfile) => {
      if (liveProfile) {
        const enriched = {
          ...liveProfile,
          logoUrl: liveProfile.logoUrl || '/logo.jpg',
        };
        setBusinessProfile(enriched);
        setCachedData('profile', enriched);
      }
    });

    return () => {
      unsubProducts();
      unsubBanners();
      unsubCategories();
      unsubProfile();
    };
  }, []);

  // Product CRUD Handlers
  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit({
      ...product,
      availability: product.availability ?? 'Available',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (
    productData: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const sanitizedProductData = {
        ...productData,
        availability: (productData.availability === 'Out of Stock' ? 'Out of Stock' : 'Available') as AvailabilityStatus,
      };
      if (productToEdit) {
        await updateProduct(productToEdit.id, sanitizedProductData);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToEdit.id
              ? { ...p, ...sanitizedProductData, updatedAt: new Date().toISOString() }
              : p
          )
        );
        showToast('Product updated successfully.', 'success');
      } else {
        const newProduct = await addProduct(sanitizedProductData);
        setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
        showToast('Product added successfully.', 'success');
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      console.error('[UI ERROR] Failed to save product:', err);
      let errorMsg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.error) errorMsg = parsed.error;
      } catch {}
      showToast('Failed to save product: ' + errorMsg, 'error');
    }
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
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          showToast(`Deleted "${product.name}"`, 'success');
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
    setCategories((prev) => [...prev.filter((c) => c.id !== newCat.id), newCat]);
    return newCat;
  };

  const handleUpdateCategory = async (id: string, name: string, description?: string) => {
    await updateCategory(id, name, description);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name: name.trim(), description: description?.trim() || '' } : c
      )
    );
    setProducts((prev) =>
      prev.map((p) => (p.categoryId === id ? { ...p, categoryName: name.trim() } : p))
    );
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
            setCategories((prev) => prev.filter((c) => c.id !== category.id));
            showToast(`Deleted category "${category.name}"`, 'success');
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
    try {
      await updateBusinessProfile(updates);
      setBusinessProfile((prev) => {
        const next = { ...prev, ...updates };
        setCachedData('profile', next);
        return next;
      });
      showToast('Business details updated successfully!', 'success');
    } catch (err: any) {
      console.error('[UI ERROR] Failed to save business profile:', err);
      let errorMsg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.error) errorMsg = parsed.error;
      } catch {}
      showToast('Failed to save business details: ' + errorMsg, 'error');
    }
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
    // Delete only seed advertisement banners, keep custom uploaded banners safe!
    for (const b of banners) {
      if (b.id.startsWith('banner-ayra-seed-')) {
        try {
          await deleteAdvertisementBanner(b.id);
        } catch {}
      }
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
    await loadCatalogueData(false);
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
    setIsProductModalOpen(false);
    localStorage.removeItem('ayra_admin_session');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    showToast('Signed out of admin portal.', 'info');
    setCurrentView('admin-login');
    window.history.replaceState({}, '', '/ayradmin');
  };

  // Path to View mapping
  const getPathFromView = (view: ViewMode): string => {
    switch (view) {
      case 'admin-login':
        return '/ayradmin';
      case 'admin-dashboard':
        return '/ayradmin/dashboard';
      case 'admin-products':
        return '/ayradmin/products';
      case 'admin-categories':
        return '/ayradmin/categories';
      case 'admin-settings':
        return '/ayradmin/settings';
      case 'admin-banners':
        return '/ayradmin/advertisement';
      case 'catalogue':
      default:
        return '/';
    }
  };

  const syncUrlForView = (view: ViewMode, replace: boolean = false) => {
    const targetPath = getPathFromView(view);
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  // Sync state from current browser pathname
  const syncViewFromLocation = useCallback((isAuthenticated: boolean) => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');

    if (path === '/ayradmin' || path.startsWith('/ayradmin/')) {
      if (!isAuthenticated) {
        setCurrentView('admin-login');
        if (path !== '/ayradmin') {
          window.history.replaceState({}, '', '/ayradmin');
        }
      } else {
        if (path === '/ayradmin/products') {
          setCurrentView('admin-products');
        } else if (path === '/ayradmin/categories') {
          setCurrentView('admin-categories');
        } else if (path === '/ayradmin/settings') {
          setCurrentView('admin-settings');
        } else if (path === '/ayradmin/advertisement' || path === '/ayradmin/banners') {
          setCurrentView('admin-banners');
        } else {
          setCurrentView('admin-dashboard');
          if (path !== '/ayradmin/dashboard') {
            window.history.replaceState({}, '', '/ayradmin/dashboard');
          }
        }
      }
    } else {
      setCurrentView('catalogue');
    }
  }, []);

  // Sync location on mount and when auth state initializes
  useEffect(() => {
    if (authInitialized) {
      const isAuth = checkIsAdminAuthenticated();
      syncViewFromLocation(isAuth);
    }
  }, [authInitialized, checkIsAdminAuthenticated, syncViewFromLocation]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const isAuth = checkIsAdminAuthenticated();
      syncViewFromLocation(isAuth);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [checkIsAdminAuthenticated, syncViewFromLocation]);

  // Route protection & navigation
  const navigateTo = (view: ViewMode) => {
    setIsProductModalOpen(false);
    const isAuthenticated = checkIsAdminAuthenticated();

    if (view.startsWith('admin') && view !== 'admin-login' && !isAuthenticated) {
      setCurrentView('admin-login');
      syncUrlForView('admin-login');
    } else {
      setCurrentView(view);
      syncUrlForView(view);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans text-[#F5F5F5]">
      {/* Universal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        isAuthenticated={checkIsAdminAuthenticated()}
        onLogout={handleLogout}
        businessProfile={businessProfile}
        onShare={handleShareCatalogue}
      />

      {/* Quota Exceeded Notification Banner */}
      {isQuotaExceeded && (
        <div id="quota-exceeded-banner" className="bg-[#1A0F0F] border-b border-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-200/90 flex items-center justify-center space-x-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-[10px] border border-amber-500/20 shrink-0">!</span>
          <span>
            <strong>Database Read Quota Exceeded:</strong> Ayra Fashion is operating in secure <strong>Offline Mode</strong>. All data loads from the local browser cache. Your changes are fully safe and saved locally.
          </span>
        </div>
      )}

      {/* Main View Router */}
      <div className="flex-1">
        {currentView === 'catalogue' && (
          <CatalogueView
            products={products}
            categories={categories}
            businessProfile={businessProfile}
            banners={banners}
            onShareCatalogue={handleShareCatalogue}
            onShowToast={showToast}
            isLoading={isLoadingData}
            hasError={hasError}
            onRetry={() => loadCatalogueData(true)}
          />
        )}

        {currentView === 'admin-login' && (
          <AdminLogin
            businessProfile={businessProfile}
            onLoginSuccess={() => {
              localStorage.setItem('ayra_admin_session', 'true');
              navigateTo('admin-dashboard');
            }}
            onBackToCatalogue={() => navigateTo('catalogue')}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            products={products}
            categories={categories}
            banners={banners}
            businessProfile={businessProfile}
            onOpenAddProduct={handleOpenAddProduct}
            onEditProduct={handleOpenEditProduct}
            onToggleAvailability={handleToggleProductAvailability}
            onNavigateToProducts={() => navigateTo('admin-products')}
            onNavigateToCategories={() => navigateTo('admin-categories')}
            onNavigateToBanners={() => navigateTo('admin-banners')}
            onViewPublicCatalogue={() => navigateTo('catalogue')}
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
            onOpenCatalogue={() => navigateTo('catalogue')}
            onShowToast={showToast}
          />
        )}

        {currentView === 'admin-banners' && (
          <BannerManagement
            banners={banners}
            onBannersUpdated={() => {
              // Real-time subscription automatically keeps banners state updated
            }}
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
