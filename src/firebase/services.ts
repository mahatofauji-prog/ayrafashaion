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
import { BusinessProfile, Category, Product, AvailabilityStatus } from '../types';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './seed';

const BUSINESS_ID = 'ayra-fashion';
const BUSINESSES_COL = 'businesses';
const CATEGORIES_COL = 'categories';
const PRODUCTS_COL = 'products';

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
      // Seed initial categories
      const seededCategories: Category[] = [];
      for (const cat of INITIAL_CATEGORIES) {
        const catDoc = doc(db, CATEGORIES_COL, cat.id);
        const catData: Category = {
          ...cat,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(catDoc, catData);
        seededCategories.push(catData);
      }
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
      // Seed initial products
      const seededProducts: Product[] = [];
      for (const prod of INITIAL_PRODUCTS) {
        const prodDoc = doc(db, PRODUCTS_COL, prod.id);
        const prodData: Product = {
          ...prod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(prodDoc, prodData);
        } catch (e) {
          console.warn('Seeding product to Firestore notice:', e);
        }
        seededProducts.push(prodData);
      }
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

  // Always update local cache
  const currentLocals = getLocalCustomProducts();
  saveLocalCustomProducts([newProduct, ...currentLocals]);

  try {
    await setDoc(doc(db, PRODUCTS_COL, id), newProduct);
  } catch (error) {
    console.warn('Firestore write notice (product saved locally):', error);
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
    const prodRef = doc(db, PRODUCTS_COL, id);
    await updateDoc(prodRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Firestore update notice (updated locally):', error);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const currentLocals = getLocalCustomProducts();
  saveLocalCustomProducts(currentLocals.filter(p => p.id !== id));

  try {
    await deleteDoc(doc(db, PRODUCTS_COL, id));
  } catch (error) {
    console.warn('Firestore delete notice (deleted locally):', error);
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

    // Compress image client-side via canvas
    const compressedDataUrl = await compressImage(file);
    if (onProgress) onProgress(60);

    // Try uploading to Firebase Storage with a 2-second timeout fallback
    try {
      const filename = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, filename);
      
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(storageRef, blob);

      const storagePromise = new Promise<string>((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 35) + 60;
            if (onProgress) onProgress(Math.min(pct, 95));
          },
          (error) => {
            console.warn('Firebase Storage upload notice, using optimized data URL:', error);
            resolve(compressedDataUrl);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve(downloadUrl);
            } catch {
              resolve(compressedDataUrl);
            }
          }
        );
      });

      // 2.5 second timeout safeguard so upload NEVER gets stuck at 40%
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => {
          if (onProgress) onProgress(100);
          resolve(compressedDataUrl);
        }, 2500);
      });

      return await Promise.race([storagePromise, timeoutPromise]);
    } catch {
      if (onProgress) onProgress(100);
      return compressedDataUrl;
    }
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process product image. Please try another image.');
  }
}
