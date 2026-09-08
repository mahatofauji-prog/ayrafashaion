import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseErrorInfo } from '../types';

const rawUrl: string = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ipyhwhferfklubcffykw.supabase.co';
export const supabaseUrl: string = rawUrl.startsWith('http')
  ? rawUrl
  : `https://${rawUrl}.supabase.co`;

const rawAnonKey: string = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// CRITICAL SECURITY ENFORCEMENT:
// The Supabase secret/service-role key (e.g. sb_secret_...) must NEVER be used in the browser!
const isSecretKey = rawAnonKey.startsWith('sb_secret_') || rawAnonKey.includes('service_role');
if (isSecretKey) {
  console.warn(
    '[AYRA SECURITY ALERT] A secret/service-role key was detected in VITE_SUPABASE_ANON_KEY. ' +
    'Per security rules, this has been blocked from browser execution to prevent exposure. ' +
    'Please set the public "anon" publishable key (starting with eyJ... or sb_publishable_...) in your project settings.'
  );
}

export const supabaseAnonKey: string = isSecretKey ? '' : rawAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('placeholder') &&
  !supabaseAnonKey.includes('your_supabase_anon')
);

// Fallback initialization allows the app to render instantly in preview mode with local cache & seed data
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: unknown, operationType: OperationType, table: string | null): never {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    table,
  };
  console.error('[Supabase Error]:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// Deprecated alias for backwards-compatibility during migration
export const handleFirestoreError = handleSupabaseError;
