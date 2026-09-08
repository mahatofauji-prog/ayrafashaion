# AYRA FASHION Firebase to Supabase Migration Instructions

Your Firebase read quota has been exhausted. To preserve your existing data and securely migrate it to Supabase without losing anything, follow these steps.

## Step 1: Prepare Firebase Credentials

1. Go to your **Firebase Console**.
2. Select your project.
3. Go to **Project Settings** (gear icon) > **Service Accounts**.
4. Click **Generate new private key** and save the JSON file.
5. Rename the downloaded file to `firebase-service-account.json`.
6. Place it in the root folder of this project (next to `migrate-data.js`).

## Step 2: Prepare Supabase Credentials

1. Go to your **Supabase Dashboard** (https://ipyhwhferfklubcffykw.supabase.co).
2. Go to **Project Settings** > **API**.
3. Locate your **`service_role` secret**. 
   *(Do NOT put this in `VITE_SUPABASE_ANON_KEY` or expose it to the browser. It is strictly for backend migration.)*
4. Create a file named `.env` in the root folder with the following contents:
   ```env
   SUPABASE_URL=https://ipyhwhferfklubcffykw.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   ```

## Step 3: Run the Migration Script

Run the following commands in your terminal to migrate your data securely. 

*Note: Since your Firebase quota is currently exhausted, you may need to wait until it resets (usually midnight Pacific Time), or upgrade your Firebase plan to Blaze (Pay-as-you-go) temporarily to run this export.*

```bash
# 1. Install required dependencies
npm install firebase-admin @supabase/supabase-js dotenv

# 2. Execute the migration script
node migrate-data.js
```

## Step 4: Storage Images

Your current product images and banners are hosted in Firebase Storage. The `migrate-data.js` script will preserve the exact image URLs (e.g., `https://firebasestorage.googleapis.com/...`). 
This means **your images will continue to work perfectly fine** in the new Supabase application without you having to re-upload them.

If you eventually want to delete Firebase completely, you will need to re-upload the images directly in the AYRA FASHION Admin Dashboard (which now uploads to the new Supabase `ayra-media` bucket).

## Step 5: Clean Up

Once the migration is complete and you have verified the data in Supabase, you must delete the following sensitive files:
- `firebase-service-account.json`
- `.env` (the one containing the `service_role` key)
- `firebase-applet-config.json` (if present)
