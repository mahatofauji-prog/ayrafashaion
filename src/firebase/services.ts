import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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

// ---- Business Profile Services ----

export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const businessDocRef = doc(db, BUSINESSES_COL, BUSINESS_ID);
    const snap = await getDoc(businessDocRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as BusinessProfile;
    } else {
      // Initialize with default AYRA FASHION profile
      const initialData: BusinessProfile = {
        ...DEFAULT_BUSINESS_PROFILE,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(businessDocRef, initialData);
      return initialData;
    }
  } catch (error) {
    console.warn('Failed to load business profile from Firestore, using default profile:', error);
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<void> {
  try {
    const businessDocRef = doc(db, BUSINESSES_COL, BUSINESS_ID);
    await setDoc(businessDocRef, {
      ...data,
      id: BUSINESS_ID,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BUSINESSES_COL}/${BUSINESS_ID}`);
  }
}

// ---- Category Services ----

export async function getCategories(): Promise<Category[]> {
  try {
    const colRef = collection(db, CATEGORIES_COL);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      // Seed initial categories in parallel
      const seededCategories: Category[] = INITIAL_CATEGORIES.map(cat => ({
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await Promise.all(
        seededCategories.map(catData => setDoc(doc(db, CATEGORIES_COL, catData.id), catData))
      );
      return seededCategories;
    }

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Category[];
  } catch (error) {
    console.warn('Error fetching categories, falling back to initial data:', error);
    return INITIAL_CATEGORIES.map(c => ({
      ...c,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
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
    return newCategory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CATEGORIES_COL}/${id}`);
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

    // Also update categoryName in any products matching this categoryId
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    for (const pDoc of productsSnap.docs) {
      if (pDoc.data().categoryId === id) {
        await updateDoc(pDoc.ref, {
          categoryName: name.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CATEGORIES_COL}/${id}`);
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Check if products exist in this category
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    const matchingProducts = productsSnap.docs.filter(d => d.data().categoryId === id);

    if (matchingProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete category: ${matchingProducts.length} product(s) are currently assigned to it. Please reassign or delete those products first.`,
      };
    }

    await deleteDoc(doc(db, CATEGORIES_COL, id));
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COL}/${id}`);
  }
}

// Helper for local custom products persistence
function getLocalCustomProducts(): Product[] {
  try {
    const raw = localStorage.getItem('ayra_custom_products');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomProducts(products: Product[]) {
  try {
    localStorage.setItem('ayra_custom_products', JSON.stringify(products));
  } catch (err) {
    console.warn('Failed to save products to localStorage:', err);
  }
}

// ---- Product Services ----

export async function getProducts(): Promise<Product[]> {
  const localItems = getLocalCustomProducts();
  try {
    const colRef = collection(db, PRODUCTS_COL);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      // Seed initial products in parallel
      const seededProducts: Product[] = INITIAL_PRODUCTS.map(prod => ({
        ...prod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await Promise.all(
        seededProducts.map(async (prodData) => {
          try {
            await setDoc(doc(db, PRODUCTS_COL, prodData.id), prodData);
          } catch (e) {
            console.warn('Seeding product to Firestore notice:', e);
          }
        })
      );
      const combined = [...seededProducts];
      for (const lp of localItems) {
        if (!combined.some(p => p.id === lp.id)) {
          combined.push(lp);
        }
      }
      return combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    const items = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Product[];

    // Merge any locally added products if not in firestore yet
    const combined = [...items];
    for (const lp of localItems) {
      if (!combined.some(p => p.id === lp.id)) {
        combined.push(lp);
      }
    }

    // Sort by createdAt descending
    return combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    console.warn('Error fetching products from Firestore, using cached/initial data:', error);
    const fallback = INITIAL_PRODUCTS.map(p => ({
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const combined = [...fallback];
    for (const lp of localItems) {
      if (!combined.some(p => p.id === lp.id)) {
        combined.push(lp);
      }
    }
    return combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }
}

export async function addProduct(product: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newProduct: Product = {
    ...product,
    id,
    businessId: BUSINESS_ID,
    name: product.name.trim(),
    price: Number(product.price),
    description: product.description?.trim() || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always update local cache for quick loading
  const currentLocals = getLocalCustomProducts();
  saveLocalCustomProducts([newProduct, ...currentLocals]);

  try {
    console.log('[DEBUG] Writing product document to Firestore:', id, newProduct);
    await setDoc(doc(db, PRODUCTS_COL, id), newProduct);
    console.log('[DEBUG] Firestore product write successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product write failed:', error);
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COL}/${id}`);
  }
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const currentLocals = getLocalCustomProducts();
  const idx = currentLocals.findIndex(p => p.id === id);
  if (idx !== -1) {
    currentLocals[idx] = { ...currentLocals[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalCustomProducts(currentLocals);
  }

  try {
    console.log('[DEBUG] Updating product document in Firestore:', id, updates);
    const prodRef = doc(db, PRODUCTS_COL, id);
    await updateDoc(prodRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('[DEBUG] Firestore product update successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product update failed:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COL}/${id}`);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const currentLocals = getLocalCustomProducts();
  saveLocalCustomProducts(currentLocals.filter(p => p.id !== id));

  try {
    console.log('[DEBUG] Deleting product document from Firestore:', id);
    await deleteDoc(doc(db, PRODUCTS_COL, id));
    console.log('[DEBUG] Firestore product deletion successful!');
  } catch (error) {
    console.error('[ERROR] Firestore product deletion failed:', error);
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${id}`);
  }
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
      
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();

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

export async function getAdvertisementBanners(): Promise<AdvertisementBanner[]> {
  try {
    const colRef = collection(db, BANNERS_COL);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      // Seed initial default banners to provide a gorgeous live slider instantly!
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

    // Ensure they have a displayOrder, fallback to index
    return items.map((item, idx) => ({
      ...item,
      displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : idx,
    }));
  } catch (error) {
    console.warn('Error fetching advertisement banners:', error);
    return [];
  }
}

export async function saveAdvertisementBanner(imageUrl: string): Promise<AdvertisementBanner> {
  try {
    const banners = await getAdvertisementBanners();
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
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COL}/${id}`);
  }
}

export async function updateBannersOrder(orderedBanners: { id: string; displayOrder: number }[]): Promise<void> {
  try {
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

      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();

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
