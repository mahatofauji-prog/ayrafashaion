-- ==============================================================================
-- AYRA FASHION — COMPLETE SUPABASE PRODUCTION DATABASE & STORAGE SCHEMA
-- Project: AYRA FASHION ("The Style House")
-- Target: Supabase (PostgreSQL 15+)
-- 
-- HOW TO RUN:
-- 1. Log in to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (e.g. ipyhwhferfklubcffykw)
-- 3. Click "SQL Editor" in the left navigation sidebar
-- 4. Click "+ New query"
-- 5. Paste the entirety of this SQL script and click "Run" (or Ctrl+Enter / Cmd+Enter)
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS & UTILITIES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. BUSINESS PROFILES TABLE (Store Info, Contact, Social, Logo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id TEXT PRIMARY KEY DEFAULT 'ayra-fashion',
  business_name TEXT NOT NULL DEFAULT 'AYRA FASHION',
  business_type TEXT NOT NULL DEFAULT 'Men • Women • Kids — “The Style House”',
  logo_url TEXT DEFAULT '/logo.jpg',
  email TEXT DEFAULT 'ayra.fashion.assam@gmail.com',
  whatsapp TEXT DEFAULT '+91 91275 86750',
  contact_number TEXT DEFAULT '+91 60036 60069',
  catalogue_slug TEXT DEFAULT 'ayra-fashion',
  owner_uid TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for business_profiles
DROP TRIGGER IF EXISTS trg_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER trg_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE (Clothing Departments & Collections)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'ayra-fashion',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for categories
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (Catalogue Clothing Items)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'ayra-fashion',
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available', 'Out of Stock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe Foreign Key Constraint: products -> categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_products_category' AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT fk_products_category 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) 
    ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Foreign key fk_products_category note: %', SQLERRM;
END $$;

-- Trigger for products
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. ADVERTISEMENT BANNERS TABLE (Home Carousel & Promotions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertisement_banners (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'ayra-fashion',
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for advertisement_banners
DROP TRIGGER IF EXISTS trg_banners_updated_at ON public.advertisement_banners;
CREATE TRIGGER trg_banners_updated_at
BEFORE UPDATE ON public.advertisement_banners
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_availability ON public.products (availability);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products (business_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories (business_id);
CREATE INDEX IF NOT EXISTS idx_banners_order ON public.advertisement_banners (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.advertisement_banners (is_active);

-- -----------------------------------------------------------------------------
-- 6. ENABLE REALTIME SYNC (Postgres Changes -> Web App)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'advertisement_banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.advertisement_banners;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'business_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_profiles;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Realtime publication setup note: %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_banners ENABLE ROW LEVEL SECURITY;

-- 7.1 PUBLIC READ ACCESS (Allows any store customer / visitor to view catalogue)
DROP POLICY IF EXISTS "Public can view business profiles" ON public.business_profiles;
CREATE POLICY "Public can view business profiles" 
  ON public.business_profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" 
  ON public.categories 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" 
  ON public.products 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public can view active banners" ON public.advertisement_banners;
CREATE POLICY "Public can view active banners" 
  ON public.advertisement_banners 
  FOR SELECT 
  USING (true);

-- 7.2 AUTHENTICATED ADMIN ACCESS (Only logged-in admins can insert, update, delete)
DROP POLICY IF EXISTS "Authenticated users manage profiles" ON public.business_profiles;
CREATE POLICY "Authenticated users manage profiles" 
  ON public.business_profiles 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users manage categories" ON public.categories;
CREATE POLICY "Authenticated users manage categories" 
  ON public.categories 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users manage products" ON public.products;
CREATE POLICY "Authenticated users manage products" 
  ON public.products 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users manage banners" ON public.advertisement_banners;
CREATE POLICY "Authenticated users manage banners" 
  ON public.advertisement_banners 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Explicitly DROP any legacy / anon write policies to guarantee strict security
DROP POLICY IF EXISTS "Anon manage profiles with api key" ON public.business_profiles;
DROP POLICY IF EXISTS "Anon manage categories with api key" ON public.categories;
DROP POLICY IF EXISTS "Anon manage products with api key" ON public.products;
DROP POLICY IF EXISTS "Anon manage banners with api key" ON public.advertisement_banners;

-- -----------------------------------------------------------------------------
-- 8. STORAGE BUCKET CONFIGURATION (ayra-media)
-- -----------------------------------------------------------------------------
-- Automatically create or update public storage bucket for product and banner images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ayra-media',
  'ayra-media',
  true,
  10485760, -- 10 MB per file limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage Security Policies on storage.objects
-- Public visitors can VIEW images
DROP POLICY IF EXISTS "Public can view ayra-media" ON storage.objects;
CREATE POLICY "Public can view ayra-media" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'ayra-media');

-- ONLY AUTHENTICATED ADMINS can upload, update, or delete media
DROP POLICY IF EXISTS "Allow upload to ayra-media" ON storage.objects;
CREATE POLICY "Allow upload to ayra-media" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'ayra-media');

DROP POLICY IF EXISTS "Allow update in ayra-media" ON storage.objects;
CREATE POLICY "Allow update in ayra-media" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'ayra-media')
  WITH CHECK (bucket_id = 'ayra-media');

DROP POLICY IF EXISTS "Allow delete in ayra-media" ON storage.objects;
CREATE POLICY "Allow delete in ayra-media" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'ayra-media');

-- -----------------------------------------------------------------------------
-- 9. INITIAL STORE SEED DATA (Non-destructive: ON CONFLICT DO NOTHING)
-- -----------------------------------------------------------------------------
-- 9.1 Default Store Business Profile
INSERT INTO public.business_profiles (
  id, business_name, business_type, logo_url, email, whatsapp, contact_number, catalogue_slug
)
VALUES (
  'ayra-fashion',
  'AYRA FASHION',
  'Men • Women • Kids — “The Style House”',
  '/logo.jpg',
  'ayra.fashion.assam@gmail.com',
  '+91 91275 86750',
  '+91 60036 60069',
  'ayra-fashion'
)
ON CONFLICT (id) DO NOTHING;

-- 9.2 Categories
INSERT INTO public.categories (id, business_id, name, slug, description)
VALUES
  ('cat-shirts', 'ayra-fashion', 'Shirts', 'shirts', 'Formal, casual, and linen shirts for men'),
  ('cat-sarees', 'ayra-fashion', 'Sarees', 'sarees', 'Traditional silk, georgette, and designer sarees'),
  ('cat-dresses', 'ayra-fashion', 'Dresses', 'dresses', 'Casual, party wear, and ethnic dresses'),
  ('cat-tshirts', 'ayra-fashion', 'T-Shirts', 't-shirts', 'Round neck, polo, and printed graphic tees'),
  ('cat-jeans', 'ayra-fashion', 'Jeans', 'jeans', 'Slim fit, straight, and stretchable denim trousers'),
  ('cat-men', 'ayra-fashion', 'Men', 'men', 'Complete collection of menswear'),
  ('cat-women', 'ayra-fashion', 'Women', 'women', 'Western, ethnic, and daily wear for women'),
  ('cat-kids', 'ayra-fashion', 'Kids', 'kids', 'Comfortable & festive clothes for boys and girls'),
  ('cat-accessories', 'ayra-fashion', 'Accessories', 'accessories', 'Belts, dupattas, stoles, and fashion add-ons')
ON CONFLICT (id) DO NOTHING;

-- 9.3 Initial Catalogue Products
INSERT INTO public.products (
  id, business_id, name, price, category_id, category_name, image_url, description, availability
)
VALUES
  ('prod-1', 'ayra-fashion', 'Premium Cotton Shirt', 799, 'cat-shirts', 'Shirts', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80', '100% breathable pure combed cotton casual shirt with spread collar and tailored fit. Ideal for office and daily casual wear.', 'Available'),
  ('prod-2', 'ayra-fashion', 'Women''s Floral Anarkali Dress', 1499, 'cat-dresses', 'Dresses', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80', 'Flowy flared rayon Anarkali with intricate botanical floral prints and gold lace detailing on neckline.', 'Available'),
  ('prod-3', 'ayra-fashion', 'Classic Slim-Fit Denim Jeans', 1199, 'cat-jeans', 'Jeans', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80', 'Stretchable rugged indigo blue denim trousers with 5-pocket styling, durable brass rivets, and modern tapered leg.', 'Available'),
  ('prod-4', 'ayra-fashion', 'Designer Kanjivaram Silk Saree', 2999, 'cat-sarees', 'Sarees', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80', 'Traditional rich jacquard woven gold zari border saree in royal maroon with unstitched matching blouse piece.', 'Available'),
  ('prod-5', 'ayra-fashion', 'Men''s Casual Crew Neck T-Shirt', 449, 'cat-tshirts', 'T-Shirts', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', 'Supima cotton bio-washed solid charcoal grey round-neck tee. Ultra-soft feel, anti-pilling, and shrink-resistant.', 'Available'),
  ('prod-6', 'ayra-fashion', 'Kids Festive Jacquard Kurta Set', 899, 'cat-kids', 'Kids', 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&auto=format&fit=crop&q=80', 'Vibrant silk-blend ethnic kurta with comfortable churidar pyjama set for boys, perfect for festive celebrations.', 'Available'),
  ('prod-7', 'ayra-fashion', 'Embroidered Party Wear Georgette Kurti', 1299, 'cat-women', 'Women', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80', 'Pastel peach faux georgette tunic with fine thread and sequin embroidery on yolk and cuffs.', 'Available'),
  ('prod-8', 'ayra-fashion', 'Pure Leather Reversible Formal Belt', 599, 'cat-accessories', 'Accessories', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&auto=format&fit=crop&q=80', 'Top-grain genuine leather belt with dual-tone black & brown finish and 360-degree twist buckle.', 'Available'),
  ('prod-9', 'ayra-fashion', 'Breathable Olive Linen Shirt', 949, 'cat-shirts', 'Shirts', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80', 'Lightweight pure French linen shirt with mandarin collar, ideal for summer comfort and subtle luxury.', 'Out of Stock')
ON CONFLICT (id) DO NOTHING;

-- 9.4 Hero Advertisement Banners
INSERT INTO public.advertisement_banners (id, business_id, image_url, is_active, display_order)
VALUES
  ('banner-ayra-seed-1', 'ayra-fashion', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80', true, 0),
  ('banner-ayra-seed-2', 'ayra-fashion', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80', true, 1),
  ('banner-ayra-seed-3', 'ayra-fashion', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80', true, 2)
ON CONFLICT (id) DO NOTHING;
