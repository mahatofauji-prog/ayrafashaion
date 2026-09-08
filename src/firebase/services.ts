import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './config';
import { BusinessProfile, Category, Product, AvailabilityStatus, AdvertisementBanner } from '../types';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './seed';

const BUSINESS_ID = 'ayra-fashion';
const BUSINESSES_COL = 'businesses';
const CATEGORIES_COL = 'categories';
const PRODUCTS_COL = 'products';
const BANNERS_COL = 'advertisementBanners';

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

// ---- Single Collection & Document Listener Manager ----
// Prevents duplicate Firestore subscriptions, avoids redundant getDocs reads,
// caches data locally, and ensures instant zero-latency UI rendering.
class SingleCollectionListener<T> {
  private colName: string;
  private isDocument: boolean;
  private docId?: string;
  private cacheKey: string;
  private transform: (snap: any) => T;
  private subscribers = new Set<(data: T) => void>();
  private errorSubscribers = new Set<(err: Error) => void>();
  private unsubscribeFirestore: Unsubscribe | null = null;
  private cachedData: T | null = null;
  private lastFetchTime = 0;

  constructor(options: {
    colName: string;
    isDocument?: boolean;
    docId?: string;
    cacheKey: string;
    transform: (snap: any) => T;
    defaultData?: T;
  }) {
    this.colName = options.colName;
    this.isDocument = !!options.isDocument;
    this.docId = options.docId;
    this.cacheKey = options.cacheKey;
    this.transform = options.transform;

    // Pre-populate with local cache if available
    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        this.cachedData = JSON.parse(stored);
      } else if (options.defaultData !== undefined) {
        this.cachedData = options.defaultData;
      }
    } catch {
      if (options.defaultData !== undefined) {
        this.cachedData = options.defaultData;
      }
    }
  }

  getData(): T | null {
    return this.cachedData;
  }

  setData(data: T) {
    this.cachedData = data;
    this.lastFetchTime = Date.now();
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch {}
    this.subscribers.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[SingleListener ${this.colName}] Callback error:`, err);
      }
    });
  }

  subscribe(onUpdate: (data: T) => void, onError?: (error: Error) => void): Unsubscribe {
    this.subscribers.add(onUpdate);
    if (onError) this.errorSubscribers.add(onError);

    // Provide cached data immediately to eliminate blank screen delays
    if (this.cachedData !== null) {
      try {
        onUpdate(this.cachedData);
      } catch (err) {
        console.error(`[SingleListener ${this.colName}] Initial update error:`, err);
      }
    }

    // Connect to Firestore onSnapshot only once across the whole app
    this.ensureFirestoreListener();

    return () => {
      this.subscribers.delete(onUpdate);
      if (onError) this.errorSubscribers.delete(onError);

      if (this.subscribers.size === 0 && this.unsubscribeFirestore) {
        try {
          this.unsubscribeFirestore();
        } catch {}
        this.unsubscribeFirestore = null;
      }
    };
  }

  ensureFirestoreListener() {
    if (this.unsubscribeFirestore) return;

    try {
      const targetRef = this.isDocument
        ? doc(db, this.colName, this.docId!)
        : collection(db, this.colName);

      this.unsubscribeFirestore = onSnapshot(
        targetRef as any,
        (snap: any) => {
          try {
            const transformed = this.transform(snap);
            this.cachedData = transformed;
            this.lastFetchTime = Date.now();

            // Automatic recovery: successful read clears quota exceeded status immediately
            setDatabaseQuotaExceeded(false);

            try {
              localStorage.setItem(this.cacheKey, JSON.stringify(transformed));
            } catch {}

            this.subscribers.forEach((cb) => {
              try {
                cb(transformed);
              } catch (err) {
                console.error(`[SingleListener ${this.colName}] Subscriber error:`, err);
              }
            });
          } catch (err) {
            console.error(`[SingleListener ${this.colName}] Snapshot parse error:`, err);
          }
        },
        (error: Error) => {
          // In Firestore SDK, once onSnapshot errors, Firestore shuts down the listener
          this.unsubscribeFirestore = null;

          const errStr = error?.message || String(error);
          const isQuota =
            errStr.toLowerCase().includes('quota') ||
            errStr.toLowerCase().includes('resource_exhausted') ||
            errStr.toLowerCase().includes('resource-exhausted') ||
            (error as any)?.code === 'resource-exhausted';

          if (isQuota) {
            setDatabaseQuotaExceeded(true);
            console.warn(`[SingleListener ${this.colName}] Firestore read quota exceeded. Operating in offline cache mode.`);
          } else {
            console.warn(`[SingleListener ${this.colName}] Real-time listener notice:`, error);
          }

          this.errorSubscribers.forEach((cb) => {
            try {
              cb(error);
            } catch (err) {
              console.error(`[SingleListener ${this.colName}] Error handler error:`, err);
            }
          });
        }
      );
    } catch (err) {
      this.unsubscribeFirestore = null;
      console.warn(`[SingleListener ${this.colName}] Failed to attach onSnapshot:`, err);
    }
  }

  reconnect() {
    if (this.unsubscribeFirestore) {
      try {
        this.unsubscribeFirestore();
      } catch {}
      this.unsubscribeFirestore = null;
    }
    this.ensureFirestoreListener();
  }

  async getOrFetch(fetcher: () => Promise<T>, forceRefresh = false, ttlMs = 180000): Promise<T> {
    // 1. If active listener exists and we have data, use the real-time cached data (0 reads!)
    if (this.unsubscribeFirestore && this.cachedData !== null) {
      return this.cachedData;
    }

    // 2. If quota is known to be exceeded and we have local cache, return it immediately without failing network calls
    if (isDatabaseQuotaExceeded && this.cachedData !== null) {
      return this.cachedData;
    }

    // 3. If cache is fresh within TTL and forceRefresh is false, return cached data
    if (!forceRefresh && this.cachedData !== null && Date.now() - this.lastFetchTime < ttlMs) {
      return this.cachedData;
    }

    try {
      const fresh = await fetcher();
      this.setData(fresh);
      setDatabaseQuotaExceeded(false);
      return fresh;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      const isQuota =
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('resource_exhausted') ||
        errStr.toLowerCase().includes('resource-exhausted') ||
        (err as any)?.code === 'resource-exhausted';

      if (isQuota) {
        setDatabaseQuotaExceeded(true);
      }

      if (this.cachedData !== null) {
        return this.cachedData;
      }
      throw err;
    }
  }
}

// Single active listeners for the four core collections
const profileListener = new SingleCollectionListener<BusinessProfile>({
  colName: BUSINESSES_COL,
  isDocument: true,
  docId: BUSINESS_ID,
  cacheKey: 'ayra_cache_profile',
  defaultData: DEFAULT_BUSINESS_PROFILE,
  transform: (snap) => {
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as BusinessProfile;
    }
    return DEFAULT_BUSINESS_PROFILE;
  },
});

const categoriesListener = new SingleCollectionListener<Category[]>({
  colName: CATEGORIES_COL,
  cacheKey: 'ayra_cache_categories',
  defaultData: INITIAL_CATEGORIES.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  transform: (snap) => {
    if (snap.empty) {
      return INITIAL_CATEGORIES.map((cat) => ({
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    return snap.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Category[];
  },
});

const productsListener = new SingleCollectionListener<Product[]>({
  colName: PRODUCTS_COL,
  cacheKey: 'ayra_cache_products',
  defaultData: INITIAL_PRODUCTS.map((prod) => ({
    ...prod,
    availability: prod.availability ?? 'Available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  transform: (snap) => {
    if (snap.empty) {
      return INITIAL_PRODUCTS.map((prod) => ({
        ...prod,
        availability: prod.availability ?? 'Available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    const items = snap.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        availability: data.availability ?? 'Available',
      };
    }) as Product[];
    return items.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },
});

const bannersListener = new SingleCollectionListener<AdvertisementBanner[]>({
  colName: BANNERS_COL,
  cacheKey: 'ayra_cache_banners',
  defaultData: [],
  transform: (snap) => {
    const items = snap.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as AdvertisementBanner[];
    return items
      .map((item: any, idx: number) => ({
        ...item,
        displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : idx,
      }))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  },
});

export function reconnectAllListeners() {
  profileListener.reconnect();
  categoriesListener.reconnect();
  productsListener.reconnect();
  bannersListener.reconnect();
}

// ---- Business Profile Services ----

export async function getBusinessProfile(forceRefresh = false): Promise<BusinessProfile> {
  return profileListener.getOrFetch(async () => {
    try {
      const businessDocRef = doc(db, BUSINESSES_COL, BUSINESS_ID);
      const snap = await getDoc(businessDocRef);

      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as BusinessProfile;
      } else {
        const initialData: BusinessProfile = {
          ...DEFAULT_BUSINESS_PROFILE,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(businessDocRef, initialData);
        return initialData;
      }
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      const isQuota =
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('resource_exhausted') ||
        errStr.toLowerCase().includes('resource-exhausted') ||
        (error as any)?.code === 'resource-exhausted';

      if (isQuota) {
        setDatabaseQuotaExceeded(true);
        console.warn('[WARN] Firestore read quota exceeded. Using cached profile.');
        return profileListener.getData() || DEFAULT_BUSINESS_PROFILE;
      }

      console.error('[ERROR] Failed to load business profile from Firestore:', error);
      return handleFirestoreError(error, OperationType.GET, `${BUSINESSES_COL}/${BUSINESS_ID}`);
    }
  }, forceRefresh);
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<void> {
  try {
    const businessDocRef = doc(db, BUSINESSES_COL, BUSINESS_ID);
    await setDoc(
      businessDocRef,
      {
        ...data,
        id: BUSINESS_ID,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    const current = profileListener.getData() || DEFAULT_BUSINESS_PROFILE;
    profileListener.setData({ ...current, ...data });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BUSINESSES_COL}/${BUSINESS_ID}`);
  }
}

// ---- Category Services ----

export async function getCategories(forceRefresh = false): Promise<Category[]> {
  return categoriesListener.getOrFetch(async () => {
    try {
      const colRef = collection(db, CATEGORIES_COL);
      const snap = await getDocs(colRef);

      if (snap.empty) {
        const seededCategories: Category[] = INITIAL_CATEGORIES.map((cat) => ({
          ...cat,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        await Promise.all(
          seededCategories.map((catData) => setDoc(doc(db, CATEGORIES_COL, catData.id), catData))
        );
        return seededCategories;
      }

      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Category[];
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      const isQuota =
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('resource_exhausted') ||
        errStr.toLowerCase().includes('resource-exhausted') ||
        (error as any)?.code === 'resource-exhausted';

      if (isQuota) {
        setDatabaseQuotaExceeded(true);
        console.warn('[WARN] Firestore read quota exceeded. Using cached categories.');
        return (
          categoriesListener.getData() ||
          INITIAL_CATEGORIES.map((c) => ({
            ...c,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      console.error('[ERROR] Error fetching categories from Firestore:', error);
      return handleFirestoreError(error, OperationType.LIST, CATEGORIES_COL);
    }
  }, forceRefresh);
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, CATEGORIES_COL, id), newCategory);
    const current = categoriesListener.getData() || [];
    categoriesListener.setData([...current.filter((c) => c.id !== id), newCategory]);
    return newCategory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CATEGORIES_COL}/${id}`);
    throw error;
  }
}

export async function updateCategory(id: string, name: string, description?: string): Promise<void> {
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const catRef = doc(db, CATEGORIES_COL, id);
    await updateDoc(catRef, {
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      updatedAt: new Date().toISOString(),
    });

    const current = categoriesListener.getData() || [];
    categoriesListener.setData(
      current.map((c) =>
        c.id === id ? { ...c, name: name.trim(), description: description?.trim() || '' } : c
      )
    );

    // Update categoryName in matching products without getDocs reads
    const currentProducts = productsListener.getData() || [];
    const matchingProducts = currentProducts.filter((p) => p.categoryId === id);
    if (matchingProducts.length > 0) {
      productsListener.setData(
        currentProducts.map((p) => (p.categoryId === id ? { ...p, categoryName: name.trim() } : p))
      );
      for (const p of matchingProducts) {
        try {
          await updateDoc(doc(db, PRODUCTS_COL, p.id), {
            categoryName: name.trim(),
            updatedAt: new Date().toISOString(),
          });
        } catch {}
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CATEGORIES_COL}/${id}`);
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Check if products exist in this category using in-memory cache to save Firestore reads
    const currentProducts = productsListener.getData() || [];
    const matchingProducts = currentProducts.filter((d) => d.categoryId === id);

    if (matchingProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete category: ${matchingProducts.length} product(s) are currently assigned to it. Please reassign or delete those products first.`,
      };
    }

    await deleteDoc(doc(db, CATEGORIES_COL, id));
    const current = categoriesListener.getData() || [];
    categoriesListener.setData(current.filter((c) => c.id !== id));
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COL}/${id}`);
    throw error;
  }
}

// ---- Product Services ----

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return productsListener.subscribe(onUpdate, onError);
}

export function subscribeToBanners(
  onUpdate: (banners: AdvertisementBanner[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return bannersListener.subscribe(onUpdate, onError);
}

export function subscribeToBusinessProfile(
  onUpdate: (profile: BusinessProfile) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return profileListener.subscribe(onUpdate, onError);
}

export function subscribeToCategories(
  onUpdate: (categories: Category[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return categoriesListener.subscribe(onUpdate, onError);
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  return productsListener.getOrFetch(async () => {
    try {
      const colRef = collection(db, PRODUCTS_COL);
      const snap = await getDocs(colRef);

      if (snap.empty) {
        return INITIAL_PRODUCTS.map((prod) => ({
          ...prod,
          availability: prod.availability ?? 'Available',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }

      const items = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          availability: data.availability ?? 'Available',
        };
      }) as Product[];

      return items.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      const isQuota =
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('resource_exhausted') ||
        errStr.toLowerCase().includes('resource-exhausted') ||
        (error as any)?.code === 'resource-exhausted';

      if (isQuota) {
        setDatabaseQuotaExceeded(true);
        console.warn('[WARN] Firestore read quota exceeded. Using cached products.');
        return (
          productsListener.getData() ||
          INITIAL_PRODUCTS.map((p) => ({
            ...p,
            availability: p.availability ?? 'Available',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      console.error('[ERROR] Error fetching products from Firestore:', error);
      return handleFirestoreError(error, OperationType.LIST, PRODUCTS_COL);
    }
  }, forceRefresh);
}

export async function addProduct(product: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const validAvailability: AvailabilityStatus = product.availability ?? 'Available';
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

  // Strip undefined fields defensively so Firestore never rejects the payload
  const firestoreData: Record<string, any> = {};
  for (const [key, value] of Object.entries(newProduct)) {
    if (value !== undefined) {
      firestoreData[key] = value;
    }
  }
  firestoreData.availability = validAvailability;

  try {
    console.log('[DEBUG] Writing product document to shared Firestore:', id, firestoreData);
    await setDoc(doc(db, PRODUCTS_COL, id), firestoreData);
    console.log('[DEBUG] Shared Firestore product write successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product write failed:', error);
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COL}/${id}`);
  }

  // Update memory listener and local cache so admin device never loses uploaded items even across refreshes or offline
  try {
    const current = productsListener.getData() || [];
    const updated = [newProduct, ...current.filter((p) => p.id !== id)];
    productsListener.setData(updated);
  } catch {}

  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  try {
    const sanitizedUpdates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    // Strip undefined fields so Firestore never throws unsupported field value undefined
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        sanitizedUpdates[key] = value;
      }
    }

    // If availability was passed in updates or was undefined, ensure a valid fallback
    if ('availability' in updates) {
      sanitizedUpdates.availability = updates.availability ?? 'Available';
    }

    console.log('[DEBUG] Updating product document in shared Firestore:', id, sanitizedUpdates);
    const prodRef = doc(db, PRODUCTS_COL, id);
    await updateDoc(prodRef, sanitizedUpdates);
    console.log('[DEBUG] Shared Firestore product update successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product update failed:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COL}/${id}`);
  }

  try {
    const current = productsListener.getData() || [];
    const updated = current.map((p) =>
      p.id === id
        ? {
            ...p,
            ...updates,
            availability: (updates.availability ?? p.availability) ?? 'Available',
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    productsListener.setData(updated);
  } catch {}
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    console.log('[DEBUG] Deleting product document from shared Firestore:', id);
    await deleteDoc(doc(db, PRODUCTS_COL, id));
    console.log('[DEBUG] Shared Firestore product deletion successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product deletion failed:', error);
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${id}`);
  }

  try {
    const current = productsListener.getData() || [];
    const updated = current.filter((p) => p.id !== id);
    productsListener.setData(updated);
  } catch {}
}

export async function toggleProductAvailability(id: string, currentStatus: AvailabilityStatus): Promise<AvailabilityStatus> {
  const newStatus: AvailabilityStatus = currentStatus === 'Available' ? 'Out of Stock' : 'Available';
  await updateProduct(id, { availability: newStatus });
  return newStatus;
}

// ---- Image Compression & Upload Services ----

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
        // Return compressed webp or jpeg base64
        const dataUrl = elem.toDataURL('image/webp', quality) || elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Safely convert Base64 data URL to a binary Blob without using fetch (bypasses sandbox iframe fetch restrictions)
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
    if (onProgress) onProgress(15);

    // Compress image client-side via canvas to 1200px max, 0.75 quality (crisp but compact!)
    const compressedDataUrl = await compressImage(file, 1200, 0.75);
    if (onProgress) onProgress(60);

    console.log('[DEBUG] Product image compressed client-side. Size of compressed string:', Math.round(compressedDataUrl.length / 1024), 'KB');

    // Try uploading to Firebase Storage with a 45-second timeout fallback
    try {
      const filename = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, filename);
      
      const blob = dataURLtoBlob(compressedDataUrl);

      console.log('[DEBUG] Starting upload to Firebase Storage:', filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      const storagePromise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 35) + 60;
            if (onProgress) onProgress(Math.min(pct, 95));
            console.log('[DEBUG] Firebase Storage upload progress:', pct, '%');
          },
          (error) => {
            console.error('[ERROR] Firebase Storage upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              console.log('[DEBUG] Firebase Storage upload success! Download URL:', downloadUrl);
              resolve(downloadUrl);
            } catch (err) {
              console.error('[ERROR] Failed to retrieve download URL:', err);
              reject(err);
            }
          }
        );
      });

      // 45-second timeout safeguard so slow networks can still complete
      const timeoutPromise = new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Firebase Storage upload timed out after 45 seconds'));
        }, 45000);
      });

      return await Promise.race([storagePromise, timeoutPromise]);
    } catch (err: any) {
      console.warn('[WARN] Firebase Storage upload failed/timed out. Generating a highly-optimized small base64 fallback to prevent document limits:', err);
      if (onProgress) onProgress(100);
      // Fallback to highly optimized tiny base64 to ensure it saves successfully to Firestore without document size errors
      const tinyBase64 = await compressImage(file, 400, 0.4);
      console.log('[DEBUG] Tiny base64 fallback generated. Size:', Math.round(tinyBase64.length / 1024), 'KB');
      return tinyBase64;
    }
  } catch (error) {
    console.error('[ERROR] Image processing error:', error);
    throw new Error('Failed to process product image. Please try another image.');
  }
}

// ---- Advertisement Banner Services ----

export async function getAdvertisementBanners(forceRefresh = false): Promise<AdvertisementBanner[]> {
  return bannersListener.getOrFetch(async () => {
    try {
      const colRef = collection(db, BANNERS_COL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        // Seed initial default banners to provide a live slider instantly
        const initialBannersData: AdvertisementBanner[] = [
          {
            id: 'banner-ayra-seed-1',
            businessId: BUSINESS_ID,
            imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
            isActive: true,
            displayOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'banner-ayra-seed-2',
            businessId: BUSINESS_ID,
            imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
            isActive: true,
            displayOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'banner-ayra-seed-3',
            businessId: BUSINESS_ID,
            imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
            isActive: true,
            displayOrder: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        await Promise.all(
          initialBannersData.map(banner => setDoc(doc(db, BANNERS_COL, banner.id), banner))
        );
        return initialBannersData;
      }

      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AdvertisementBanner[];

      return items.map((item, idx) => ({
        ...item,
        displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : idx,
      })).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      const isQuota = 
        errStr.toLowerCase().includes('quota') || 
        errStr.toLowerCase().includes('resource_exhausted') || 
        errStr.toLowerCase().includes('resource-exhausted') || 
        (error as any)?.code === 'resource-exhausted';

      if (isQuota) {
        setDatabaseQuotaExceeded(true);
        console.warn('[WARN] Firestore read quota exceeded. Using cached banners.');
        return bannersListener.getData() || [];
      }

      console.error('[ERROR] Error fetching advertisement banners from Firestore:', error);
      return handleFirestoreError(error, OperationType.LIST, BANNERS_COL);
    }
  }, forceRefresh);
}

export async function saveAdvertisementBanner(imageUrl: string): Promise<AdvertisementBanner> {
  try {
    const banners = bannersListener.getData() || [];
    const displayOrder = banners.length;
    const bannerId = `banner-ayra-${Date.now()}`;
    const newBanner: AdvertisementBanner = {
      id: bannerId,
      businessId: BUSINESS_ID,
      imageUrl,
      isActive: true,
      displayOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newDocRef = doc(db, BANNERS_COL, bannerId);
    await setDoc(newDocRef, newBanner);
    bannersListener.setData([...banners, newBanner]);
    return newBanner;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BANNERS_COL}/new`);
    throw error;
  }
}

export async function addAdvertisementBanner(imageUrl: string, displayOrder: number, isActive = true): Promise<AdvertisementBanner> {
  try {
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

    const newDocRef = doc(db, BANNERS_COL, bannerId);
    await setDoc(newDocRef, newBanner);
    const current = bannersListener.getData() || [];
    const updated = [...current.filter(b => b.id !== bannerId), newBanner].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    bannersListener.setData(updated);
    return newBanner;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BANNERS_COL}/${Date.now()}`);
    throw error;
  }
}

export async function updateAdvertisementBanner(id: string, updates: Partial<AdvertisementBanner>): Promise<void> {
  try {
    const docRef = doc(db, BANNERS_COL, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const current = bannersListener.getData() || [];
    const updated = current.map(b => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b));
    bannersListener.setData(updated);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COL}/${id}`);
  }
}

export async function updateBannersOrder(orderedBanners: { id: string; displayOrder: number }[]): Promise<void> {
  try {
    const current = bannersListener.getData() || [];
    const orderMap = new Map(orderedBanners.map(o => [o.id, o.displayOrder]));
    const updated = current.map(b => orderMap.has(b.id) ? { ...b, displayOrder: orderMap.get(b.id)! } : b)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    bannersListener.setData(updated);

    for (const b of orderedBanners) {
      const docRef = doc(db, BANNERS_COL, b.id);
      await updateDoc(docRef, {
        displayOrder: b.displayOrder,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COL}/order-update`);
  }
}

export async function deleteAdvertisementBanner(id: string): Promise<void> {
  try {
    const docRef = doc(db, BANNERS_COL, id);
    await deleteDoc(docRef);
    const current = bannersListener.getData() || [];
    bannersListener.setData(current.filter(b => b.id !== id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BANNERS_COL}/${id}`);
  }
}

export async function uploadBannerImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(15);
    // Compress image up to 1200px max width for crisp 16:9 display, 0.75 quality (extremely fast and highly optimized!)
    const compressedDataUrl = await compressImage(file, 1200, 0.75);
    if (onProgress) onProgress(60);

    console.log('[DEBUG] Banner image compressed client-side. Size:', Math.round(compressedDataUrl.length / 1024), 'KB');

    try {
      const filename = `banners/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, filename);

      const blob = dataURLtoBlob(compressedDataUrl);

      console.log('[DEBUG] Starting upload to Firebase Storage for banner:', filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      const storagePromise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 35) + 60;
            if (onProgress) onProgress(Math.min(pct, 95));
            console.log('[DEBUG] Banner upload progress:', pct, '%');
          },
          (error) => {
            console.error('[ERROR] Banner Firebase Storage upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              console.log('[DEBUG] Banner Firebase Storage upload success! Download URL:', downloadUrl);
              resolve(downloadUrl);
            } catch (err) {
              console.error('[ERROR] Failed to retrieve banner download URL:', err);
              reject(err);
            }
          }
        );
      });

      // 45-second timeout safeguard
      const timeoutPromise = new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Banner upload timed out after 45 seconds'));
        }, 45000);
      });

      return await Promise.race([storagePromise, timeoutPromise]);
    } catch (err: any) {
      console.warn('[WARN] Banner Firebase Storage upload failed/timed out. Generating tiny base64 fallback:', err);
      if (onProgress) onProgress(100);
      const tinyBase64 = await compressImage(file, 500, 0.45);
      console.log('[DEBUG] Tiny banner base64 fallback generated. Size:', Math.round(tinyBase64.length / 1024), 'KB');
      return tinyBase64;
    }
  } catch (error) {
    console.error('Banner processing error:', error);
    throw new Error('Failed to process banner image.');
  }
}
