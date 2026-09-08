import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// AYRA FASHION: Firebase to Supabase Migration Script
// -----------------------------------------------------------------------------
// IMPORTANT: Wait for your Firebase read quota to reset before running this.
// Run this script locally on your machine using Node.js.
// 
// Usage:
// 1. Install dependencies: 
//    npm install firebase-admin @supabase/supabase-js dotenv
// 2. Export your Firebase Service Account JSON from Firebase Console 
//    (Project Settings -> Service Accounts -> Generate New Private Key)
//    and save it as 'firebase-service-account.json' in this folder.
// 3. Create a .env file with your Supabase credentials:
//    SUPABASE_URL=https://ipyhwhferfklubcffykw.supabase.co
//    SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
// 4. Run the script:
//    node migrate-data.js
// -----------------------------------------------------------------------------

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ipyhwhferfklubcffykw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is missing.');
  console.error('You must use the service_role key for migration to bypass RLS policies.');
  process.exit(1);
}

// Initialize Supabase (Using Service Role Key to bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Initialize Firebase Admin (Requires service account JSON)
let db;
try {
  const serviceAccount = require('./firebase-service-account.json');
  initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore();
} catch (error) {
  console.error('ERROR: Could not load firebase-service-account.json.');
  console.error('Please download your Firebase Service Account key and place it in the same directory.');
  process.exit(1);
}

async function migrateData() {
  console.log('Starting Migration from Firebase to Supabase...');

  try {
    // 1. Migrate Categories
    console.log('Fetching Categories from Firebase...');
    const categoriesSnapshot = await db.collection('categories').get();
    const categories = [];
    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        business_id: data.businessId || 'ayra-fashion',
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: data.description || '',
        product_count: data.productCount || 0,
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      });
    });

    if (categories.length > 0) {
      console.log(`Migrating ${categories.length} Categories...`);
      const { error } = await supabase.from('categories').upsert(categories);
      if (error) throw new Error(`Category Migration Error: ${error.message}`);
    }

    // 2. Migrate Products
    console.log('Fetching Products from Firebase...');
    const productsSnapshot = await db.collection('products').get();
    const products = [];
    productsSnapshot.forEach(doc => {
      const data = doc.data();
      products.push({
        id: doc.id,
        business_id: data.businessId || 'ayra-fashion',
        category_id: data.categoryId,
        category_name: data.categoryName,
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        image_url: data.imageUrl,
        availability: data.availability === 'Out of Stock' ? 'Out of Stock' : 'Available',
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      });
    });

    if (products.length > 0) {
      console.log(`Migrating ${products.length} Products...`);
      const { error } = await supabase.from('products').upsert(products);
      if (error) throw new Error(`Product Migration Error: ${error.message}`);
    }

    // 3. Migrate Banners
    console.log('Fetching Banners from Firebase...');
    const bannersSnapshot = await db.collection('advertisement_banners').get();
    const banners = [];
    bannersSnapshot.forEach(doc => {
      const data = doc.data();
      banners.push({
        id: doc.id,
        business_id: data.businessId || 'ayra-fashion',
        image_url: data.imageUrl,
        is_active: data.isActive !== undefined ? data.isActive : true,
        display_order: data.displayOrder || 0,
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      });
    });

    if (banners.length > 0) {
      console.log(`Migrating ${banners.length} Banners...`);
      const { error } = await supabase.from('advertisement_banners').upsert(banners);
      if (error) throw new Error(`Banner Migration Error: ${error.message}`);
    }

    // 4. Migrate Business Profile
    console.log('Fetching Business Profiles from Firebase...');
    const profilesSnapshot = await db.collection('business_profiles').get();
    const profiles = [];
    profilesSnapshot.forEach(doc => {
      const data = doc.data();
      profiles.push({
        id: doc.id,
        business_name: data.businessName,
        business_type: data.businessType,
        logo_url: data.logoUrl,
        email: data.email,
        whatsapp: data.whatsapp,
        contact_number: data.contactNumber,
        catalogue_slug: data.catalogueSlug,
        owner_uid: data.ownerUid || null,
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      });
    });

    if (profiles.length > 0) {
      console.log(`Migrating ${profiles.length} Business Profiles...`);
      const { error } = await supabase.from('business_profiles').upsert(profiles);
      if (error) throw new Error(`Profile Migration Error: ${error.message}`);
    }

    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('NOTE: Images in Firebase Storage must be manually transferred, or you can keep the Firebase URLs in the database as they will still load perfectly fine.');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error(error.message);
  }
}

migrateData();
