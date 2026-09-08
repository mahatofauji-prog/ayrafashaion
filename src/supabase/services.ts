import { supabase, isSupabaseConfigured, handleSupabaseError, OperationType } from './config';
import { BusinessProfile, Category, Product, AvailabilityStatus, AdvertisementBanner } from '../types';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_BANNERS } from './seed';

const BUSINESS_ID = 'ayra-fashion';
const MEDIA_BUCKET = 'ayra-media';

export type Unsubscribe = () => void;

export let isDatabaseQuotaExceeded = false;
const quotaListeners = new Set<(isExceeded: boolean) => void>();

export function onQuotaStatusChange(callback: (isExceeded: boolean) => void): Unsubscribe {
  quotaListeners.add(callback);
  callback(isDatabaseQuotaExceeded);
  return () => {
    quotaListeners.delete(callback);
  };
}

export function setDatabaseQuotaExceeded(exceeded: boolean) {
  if (isDatabaseQuotaExceeded !== exceeded) {
    isDatabaseQuotaExceeded = exceeded;
    quotaListeners.forEach((cb) => {
      try {
        cb(exceeded);
      } catch (err) {
        console.error('Quota listener callback error:', err);
      }
    });
  }
}

// -----------------------------------------------------------------------------
// Type Converters: PostgreSQL snake_case <-> TypeScript camelCase
// -----------------------------------------------------------------------------

function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    businessId: row.business_id || BUSINESS_ID,
    name: row.name || '',
    imageUrl: row.image_url || '',
    price: Number(row.price) || 0,
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    description: row.description || '',
    availability: (row.availability === 'Out of Stock' ? 'Out of Stock' : 'Available') as AvailabilityStatus,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapProductToDb(prod: Partial<Product>): Record<string, any> {
  const row: Record<string, any> = {};
  if (prod.id !== undefined) row.id = prod.id;
  if (prod.businessId !== undefined) row.business_id = prod.businessId;
  if (prod.name !== undefined) row.name = prod.name.trim();
  if (prod.imageUrl !== undefined) row.image_url = prod.imageUrl;
  if (prod.price !== undefined) row.price = Number(prod.price) || 0;
  if (prod.categoryId !== undefined) row.category_id = prod.categoryId;
  if (prod.categoryName !== undefined) row.category_name = prod.categoryName;
  if (prod.description !== undefined) row.description = prod.description.trim();
  if (prod.availability !== undefined) {
    row.availability = prod.availability === 'Out of Stock' ? 'Out of Stock' : 'Available';
  }
  if (prod.createdAt !== undefined) row.created_at = prod.createdAt;
  if (prod.updatedAt !== undefined) row.updated_at = prod.updatedAt;
  return row;
}

function mapDbCategory(row: any): Category {
  return {
    id: row.id,
    businessId: row.business_id || BUSINESS_ID,
    name: row.name || '',
    slug: row.slug || '',
    description: row.description || '',
    productCount: Number(row.product_count) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapCategoryToDb(cat: Partial<Category>): Record<string, any> {
  const row: Record<string, any> = {};
  if (cat.id !== undefined) row.id = cat.id;
  if (cat.businessId !== undefined) row.business_id = cat.businessId;
  if (cat.name !== undefined) row.name = cat.name.trim();
  if (cat.slug !== undefined) row.slug = cat.slug;
  if (cat.description !== undefined) row.description = cat.description.trim();
  if (cat.productCount !== undefined) row.product_count = cat.productCount;
  if (cat.createdAt !== undefined) row.created_at = cat.createdAt;
  if (cat.updatedAt !== undefined) row.updated_at = cat.updatedAt;
  return row;
}

function mapDbBanner(row: any): AdvertisementBanner {
  return {
    id: row.id,
    businessId: row.business_id || BUSINESS_ID,
    imageUrl: row.image_url || '',
    isActive: row.is_active ?? true,
    displayOrder: typeof row.display_order === 'number' ? row.display_order : 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapBannerToDb(banner: Partial<AdvertisementBanner>): Record<string, any> {
  const row: Record<string, any> = {};
  if (banner.id !== undefined) row.id = banner.id;
  if (banner.businessId !== undefined) row.business_id = banner.businessId;
  if (banner.imageUrl !== undefined) row.image_url = banner.imageUrl;
  if (banner.isActive !== undefined) row.is_active = banner.isActive;
  if (banner.displayOrder !== undefined) row.display_order = banner.displayOrder;
  if (banner.createdAt !== undefined) row.created_at = banner.createdAt;
  if (banner.updatedAt !== undefined) row.updated_at = banner.updatedAt;
  return row;
}

function mapDbProfile(row: any): BusinessProfile {
  return {
    id: row.id || BUSINESS_ID,
    businessName: row.business_name || DEFAULT_BUSINESS_PROFILE.businessName,
    businessType: row.business_type || DEFAULT_BUSINESS_PROFILE.businessType,
    logoUrl: row.logo_url || DEFAULT_BUSINESS_PROFILE.logoUrl,
    email: row.email || DEFAULT_BUSINESS_PROFILE.email,
    whatsapp: row.whatsapp || DEFAULT_BUSINESS_PROFILE.whatsapp,
    contactNumber: row.contact_number || DEFAULT_BUSINESS_PROFILE.contactNumber,
    catalogueSlug: row.catalogue_slug || DEFAULT_BUSINESS_PROFILE.catalogueSlug,
    ownerUid: row.owner_uid || undefined,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapProfileToDb(profile: Partial<BusinessProfile>): Record<string, any> {
  const row: Record<string, any> = {};
  if (profile.id !== undefined) row.id = profile.id;
  if (profile.businessName !== undefined) row.business_name = profile.businessName;
  if (profile.businessType !== undefined) row.business_type = profile.businessType;
  if (profile.logoUrl !== undefined) row.logo_url = profile.logoUrl;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.whatsapp !== undefined) row.whatsapp = profile.whatsapp;
  if (profile.contactNumber !== undefined) row.contact_number = profile.contactNumber;
  if (profile.catalogueSlug !== undefined) row.catalogue_slug = profile.catalogueSlug;
  if (profile.ownerUid !== undefined) row.owner_uid = profile.ownerUid;
  if (profile.updatedAt !== undefined) row.updated_at = profile.updatedAt;
  return row;
}

// -----------------------------------------------------------------------------
// Centralized Single Listener & Cache Manager
// Prevents duplicate queries, avoids quota leaks, handles offline caching
// -----------------------------------------------------------------------------
class SupabaseCollectionManager<T> {
  private tableName: string;
  private cacheKey: string;
  private subscribers = new Set<(data: T) => void>();
  private errorSubscribers = new Set<(err: Error) => void>();
  private cachedData: T | null = null;
  private channel: any = null;
  private fetchFn: () => Promise<T>;
  private isFetching = false;

  constructor(options: {
    tableName: string;
    cacheKey: string;
    defaultData: T;
    fetchFn: () => Promise<T>;
  }) {
    this.tableName = options.tableName;
    this.cacheKey = options.cacheKey;
    this.fetchFn = options.fetchFn;

    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        this.cachedData = JSON.parse(stored);
      } else {
        this.cachedData = options.defaultData;
      }
    } catch {
      this.cachedData = options.defaultData;
    }
  }

  getData(): T | null {
    return this.cachedData;
  }

  setData(data: T) {
    this.cachedData = data;
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch {}
    this.subscribers.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[Manager ${this.tableName}] Callback error:`, err);
      }
    });
  }

  subscribe(onUpdate: (data: T) => void, onError?: (error: Error) => void): Unsubscribe {
    this.subscribers.add(onUpdate);
    if (onError) this.errorSubscribers.add(onError);

    // Provide cached data immediately
    if (this.cachedData !== null) {
      try {
        onUpdate(this.cachedData);
      } catch (err) {
        console.error(`[Manager ${this.tableName}] Initial update error:`, err);
      }
    }

    this.ensureRealtimeSubscription();

    return () => {
      this.subscribers.delete(onUpdate);
      if (onError) this.errorSubscribers.delete(onError);
      if (this.subscribers.size === 0 && this.channel) {
        try {
          supabase.removeChannel(this.channel);
          this.channel = null;
        } catch {}
      }
    };
  }

  private ensureRealtimeSubscription() {
    if (!isSupabaseConfigured || this.channel) return;

    try {
      this.channel = supabase
        .channel(`public:${this.tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: this.tableName },
          async () => {
            console.log(`[Realtime ${this.tableName}] Change detected, refreshing...`);
            try {
              const fresh = await this.fetchFn();
              this.setData(fresh);
            } catch (err) {
              console.warn(`[Realtime ${this.tableName}] Fetch error:`, err);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn(`[Realtime ${this.tableName}] Subscription init warning:`, err);
    }
  }

  async getOrFetch(forceRefresh = false): Promise<T> {
    if (this.cachedData && !forceRefresh) {
      return this.cachedData;
    }
    if (this.isFetching && this.cachedData) {
      return this.cachedData;
    }

    this.isFetching = true;
    try {
      const data = await this.fetchFn();
      this.setData(data);
      return data;
    } catch (error) {
      if (this.cachedData) {
        console.warn(`[Manager ${this.tableName}] Network/fetch failed, returning cached data.`, error);
        return this.cachedData;
      }
      throw error;
    } finally {
      this.isFetching = false;
    }
  }

  reconnect() {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
        this.channel = null;
      } catch {}
    }
    this.ensureRealtimeSubscription();
  }
}

// -----------------------------------------------------------------------------
// Singleton Managers for Business Profile, Categories, Products, and Banners
// -----------------------------------------------------------------------------

const profileManager = new SupabaseCollectionManager<BusinessProfile>({
  tableName: 'business_profiles',
  cacheKey: 'ayra_cache_profile',
  defaultData: DEFAULT_BUSINESS_PROFILE,
  fetchFn: async () => {
    if (!isSupabaseConfigured) {
      return DEFAULT_BUSINESS_PROFILE;
    }
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', BUSINESS_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch profile error:', error);
      throw error;
    }
    if (data) {
      return mapDbProfile(data);
    }
    return DEFAULT_BUSINESS_PROFILE;
  },
});

const categoriesManager = new SupabaseCollectionManager<Category[]>({
  tableName: 'categories',
  cacheKey: 'ayra_cache_categories',
  defaultData: INITIAL_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  fetchFn: async () => {
    if (!isSupabaseConfigured) {
      return INITIAL_CATEGORIES.map((c) => ({
        ...c,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return INITIAL_CATEGORIES.map((c) => ({
        ...c,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    return data.map(mapDbCategory);
  },
});

const productsManager = new SupabaseCollectionManager<Product[]>({
  tableName: 'products',
  cacheKey: 'ayra_cache_products',
  defaultData: INITIAL_PRODUCTS.map((p) => ({
    ...p,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  fetchFn: async () => {
    if (!isSupabaseConfigured) {
      return INITIAL_PRODUCTS.map((p) => ({
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      return INITIAL_PRODUCTS.map((p) => ({
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    return data.map(mapDbProduct);
  },
});

const bannersManager = new SupabaseCollectionManager<AdvertisementBanner[]>({
  tableName: 'advertisement_banners',
  cacheKey: 'ayra_cache_banners',
  defaultData: INITIAL_BANNERS,
  fetchFn: async () => {
    if (!isSupabaseConfigured) {
      return INITIAL_BANNERS;
    }
    const { data, error } = await supabase
      .from('advertisement_banners')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return INITIAL_BANNERS;
    }
    return data.map(mapDbBanner);
  },
});

export function reconnectAllListeners() {
  profileManager.reconnect();
  categoriesManager.reconnect();
  productsManager.reconnect();
  bannersManager.reconnect();
}

// -----------------------------------------------------------------------------
// Business Profile Services
// -----------------------------------------------------------------------------

export async function getBusinessProfile(forceRefresh = false): Promise<BusinessProfile> {
  return profileManager.getOrFetch(forceRefresh);
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<void> {
  const current = profileManager.getData() || DEFAULT_BUSINESS_PROFILE;
  const updated: BusinessProfile = {
    ...current,
    ...data,
    id: BUSINESS_ID,
    updatedAt: new Date().toISOString(),
  };

  profileManager.setData(updated);

  if (!isSupabaseConfigured) return;

  try {
    const dbPayload = mapProfileToDb(updated);
    const { error } = await supabase
      .from('business_profiles')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'business_profiles');
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'business_profiles');
  }
}

// -----------------------------------------------------------------------------
// Category Services
// -----------------------------------------------------------------------------

export function subscribeToCategories(
  onUpdate: (categories: Category[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return categoriesManager.subscribe(onUpdate, onError);
}

export async function getCategories(forceRefresh = false): Promise<Category[]> {
  return categoriesManager.getOrFetch(forceRefresh);
}

export async function addCategory(name: string, description?: string): Promise<Category> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `cat-${slug}-${Date.now()}`;
  const newCategory: Category = {
    id,
    businessId: BUSINESS_ID,
    name: name.trim(),
    slug,
    description: description?.trim() || '',
    productCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = categoriesManager.getData() || [];
  categoriesManager.setData([...current.filter((c) => c.id !== id), newCategory]);

  if (!isSupabaseConfigured) return newCategory;

  try {
    const { error } = await supabase
      .from('categories')
      .insert(mapCategoryToDb(newCategory));

    if (error) {
      handleSupabaseError(error, OperationType.CREATE, 'categories');
    }
    return newCategory;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'categories');
  }
}

export async function updateCategory(id: string, name: string, description?: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const current = categoriesManager.getData() || [];
  const updatedCategories = current.map((c) =>
    c.id === id ? { ...c, name: name.trim(), slug, description: description?.trim() || '', updatedAt: new Date().toISOString() } : c
  );
  categoriesManager.setData(updatedCategories);

  // Update categoryName in matching products in memory
  const currentProducts = productsManager.getData() || [];
  const updatedProducts = currentProducts.map((p) =>
    p.categoryId === id ? { ...p, categoryName: name.trim() } : p
  );
  productsManager.setData(updatedProducts);

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('categories')
      .update({
        name: name.trim(),
        slug,
        description: description?.trim() || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'categories');
    }

    // Also update products referencing this category in Supabase
    await supabase
      .from('products')
      .update({ category_name: name.trim(), updated_at: new Date().toISOString() })
      .eq('category_id', id);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'categories');
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
  const currentProducts = productsManager.getData() || [];
  const matchingProducts = currentProducts.filter((p) => p.categoryId === id);

  if (matchingProducts.length > 0) {
    return {
      success: false,
      message: `Cannot delete category: ${matchingProducts.length} product(s) are currently assigned to it. Please reassign or delete those products first.`,
    };
  }

  const current = categoriesManager.getData() || [];
  categoriesManager.setData(current.filter((c) => c.id !== id));

  if (!isSupabaseConfigured) return { success: true };

  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      handleSupabaseError(error, OperationType.DELETE, 'categories');
    }
    return { success: true };
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'categories');
  }
}

// -----------------------------------------------------------------------------
// Product Services
// -----------------------------------------------------------------------------

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return productsManager.subscribe(onUpdate, onError);
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  return productsManager.getOrFetch(forceRefresh);
}

export async function addProduct(
  product: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const validAvailability: AvailabilityStatus =
    product.availability === 'Out of Stock' ? 'Out of Stock' : 'Available';

  const newProduct: Product = {
    ...product,
    id,
    businessId: BUSINESS_ID,
    name: product.name?.trim() || '',
    price: Number(product.price) || 0,
    description: product.description?.trim() || '',
    availability: validAvailability,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = productsManager.getData() || [];
  productsManager.setData([newProduct, ...current.filter((p) => p.id !== id)]);

  if (!isSupabaseConfigured) return newProduct;

  try {
    const dbPayload = mapProductToDb(newProduct);
    const { error } = await supabase.from('products').insert(dbPayload);

    if (error) {
      handleSupabaseError(error, OperationType.CREATE, 'products');
    }
    return newProduct;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'products');
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const current = productsManager.getData() || [];
  const updatedProducts: Product[] = current.map((p) => {
    if (p.id !== id) return p;
    const availability: AvailabilityStatus =
      (updates.availability ?? p.availability) === 'Out of Stock' ? 'Out of Stock' : 'Available';
    return {
      ...p,
      ...updates,
      availability,
      updatedAt: new Date().toISOString(),
    };
  });
  productsManager.setData(updatedProducts);

  if (!isSupabaseConfigured) return;

  try {
    const sanitizedUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) sanitizedUpdates.name = updates.name.trim();
    if (updates.price !== undefined) sanitizedUpdates.price = Number(updates.price) || 0;
    if (updates.imageUrl !== undefined) sanitizedUpdates.image_url = updates.imageUrl;
    if (updates.categoryId !== undefined) sanitizedUpdates.category_id = updates.categoryId;
    if (updates.categoryName !== undefined) sanitizedUpdates.category_name = updates.categoryName;
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description.trim();
    if (updates.availability !== undefined) {
      sanitizedUpdates.availability = updates.availability === 'Out of Stock' ? 'Out of Stock' : 'Available';
    }

    const { error } = await supabase.from('products').update(sanitizedUpdates).eq('id', id);

    if (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'products');
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'products');
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const current = productsManager.getData() || [];
  productsManager.setData(current.filter((p) => p.id !== id));

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      handleSupabaseError(error, OperationType.DELETE, 'products');
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'products');
  }
}

export async function toggleProductAvailability(
  id: string,
  currentStatus: AvailabilityStatus
): Promise<AvailabilityStatus> {
  const newStatus: AvailabilityStatus = currentStatus === 'Available' ? 'Out of Stock' : 'Available';
  await updateProduct(id, { availability: newStatus });
  return newStatus;
}

// -----------------------------------------------------------------------------
// Banner Services
// -----------------------------------------------------------------------------

export function subscribeToBanners(
  onUpdate: (banners: AdvertisementBanner[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return bannersManager.subscribe(onUpdate, onError);
}

export async function getAdvertisementBanners(forceRefresh = false): Promise<AdvertisementBanner[]> {
  return bannersManager.getOrFetch(forceRefresh);
}

export async function addAdvertisementBanner(
  imageUrl: string,
  displayOrder: number,
  isActive = true
): Promise<AdvertisementBanner> {
  const bannerId = `banner-ayra-${Date.now()}`;
  const newBanner: AdvertisementBanner = {
    id: bannerId,
    businessId: BUSINESS_ID,
    imageUrl,
    isActive,
    displayOrder,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = bannersManager.getData() || [];
  const updated = [...current.filter((b) => b.id !== bannerId), newBanner].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );
  bannersManager.setData(updated);

  if (!isSupabaseConfigured) return newBanner;

  try {
    const { error } = await supabase.from('advertisement_banners').insert(mapBannerToDb(newBanner));
    if (error) {
      handleSupabaseError(error, OperationType.CREATE, 'advertisement_banners');
    }
    return newBanner;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'advertisement_banners');
  }
}

export async function saveAdvertisementBanner(imageUrl: string): Promise<AdvertisementBanner> {
  const banners = bannersManager.getData() || [];
  return addAdvertisementBanner(imageUrl, banners.length, true);
}

export async function updateAdvertisementBanner(
  id: string,
  updates: Partial<AdvertisementBanner>
): Promise<void> {
  const current = bannersManager.getData() || [];
  const updated = current.map((b) =>
    b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
  );
  bannersManager.setData(updated);

  if (!isSupabaseConfigured) return;

  try {
    const dbPayload = mapBannerToDb(updates);
    dbPayload.updated_at = new Date().toISOString();
    const { error } = await supabase.from('advertisement_banners').update(dbPayload).eq('id', id);
    if (error) {
      handleSupabaseError(error, OperationType.UPDATE, 'advertisement_banners');
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'advertisement_banners');
  }
}

export async function updateBannersOrder(
  orderedBanners: { id: string; displayOrder: number }[]
): Promise<void> {
  const current = bannersManager.getData() || [];
  const orderMap = new Map(orderedBanners.map((o) => [o.id, o.displayOrder]));
  const updated = current
    .map((b) => (orderMap.has(b.id) ? { ...b, displayOrder: orderMap.get(b.id)! } : b))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  bannersManager.setData(updated);

  if (!isSupabaseConfigured) return;

  try {
    for (const b of orderedBanners) {
      await supabase
        .from('advertisement_banners')
        .update({ display_order: b.displayOrder, updated_at: new Date().toISOString() })
        .eq('id', b.id);
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, 'advertisement_banners');
  }
}

export async function deleteAdvertisementBanner(id: string): Promise<void> {
  const current = bannersManager.getData() || [];
  bannersManager.setData(current.filter((b) => b.id !== id));

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.from('advertisement_banners').delete().eq('id', id);
    if (error) {
      handleSupabaseError(error, OperationType.DELETE, 'advertisement_banners');
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'advertisement_banners');
  }
}

export function subscribeToBusinessProfile(
  onUpdate: (profile: BusinessProfile) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return profileManager.subscribe(onUpdate, onError);
}

// -----------------------------------------------------------------------------
// Image Optimization & Storage Services (Supabase Storage)
// -----------------------------------------------------------------------------

export async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = elem.toDataURL('image/webp', quality) || elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function dataURLtoBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error('Invalid data URL');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('[ERROR] Failed to convert dataURL to Blob:', err);
    throw err;
  }
}

export async function uploadProductImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);

    const compressedDataUrl = await compressImage(file, 1200, 0.75);
    if (onProgress) onProgress(60);

    if (!isSupabaseConfigured) {
      if (onProgress) onProgress(100);
      return compressedDataUrl;
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `products/${Date.now()}_${sanitizedName}`;
      const blob = dataURLtoBlob(compressedDataUrl);

      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type,
        });

      if (error) {
        console.warn('Supabase Storage upload warning, using compressed image fallback:', error);
        if (onProgress) onProgress(100);
        return compressedDataUrl;
      }

      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(data.path);

      if (onProgress) onProgress(100);
      return publicUrlData.publicUrl;
    } catch (storageErr) {
      console.warn('Storage upload error, using local compressed fallback:', storageErr);
      if (onProgress) onProgress(100);
      return compressedDataUrl;
    }
  } catch (error) {
    console.error('[ERROR] Image processing error:', error);
    throw new Error('Failed to process product image. Please try another image.');
  }
}

export async function uploadBannerImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(20);

    const compressedDataUrl = await compressImage(file, 1600, 0.8);
    if (onProgress) onProgress(60);

    if (!isSupabaseConfigured) {
      if (onProgress) onProgress(100);
      return compressedDataUrl;
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `banners/${Date.now()}_${sanitizedName}`;
      const blob = dataURLtoBlob(compressedDataUrl);

      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type,
        });

      if (error) {
        console.warn('Supabase Banner upload warning, using compressed fallback:', error);
        if (onProgress) onProgress(100);
        return compressedDataUrl;
      }

      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(data.path);

      if (onProgress) onProgress(100);
      return publicUrlData.publicUrl;
    } catch (storageErr) {
      console.warn('Banner storage error, using compressed fallback:', storageErr);
      if (onProgress) onProgress(100);
      return compressedDataUrl;
    }
  } catch (error) {
    console.error('Banner processing error:', error);
    throw new Error('Failed to process banner image.');
  }
}
