export type AvailabilityStatus = 'Available' | 'Out of Stock';

export interface Product {
  id: string;
  businessId: string;
  name: string;
  imageUrl: string;
  price: number;
  categoryId: string;
  categoryName: string;
  description?: string;
  availability: AvailabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: string;
  logoUrl?: string;
  email: string;
  whatsapp: string;
  contactNumber: string;
  catalogueSlug: string;
  ownerUid?: string;
  updatedAt?: string;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}
