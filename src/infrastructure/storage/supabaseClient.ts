import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'AMOR_AMISTAD_SUPABASE_URL';
const STORAGE_KEY_ANON = 'AMOR_AMISTAD_SUPABASE_ANON_KEY';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Obtiene la configuración actual de Supabase desde variables de entorno o LocalStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

  let localUrl = '';
  let localKey = '';
  if (typeof window !== 'undefined') {
    localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
    localKey = localStorage.getItem(STORAGE_KEY_ANON) || '';
  }

  return {
    url: (envUrl || localUrl || '').trim(),
    anonKey: (envKey || localKey || '').trim(),
  };
}

/**
 * Guarda las credenciales de Supabase en LocalStorage para persistencia en el navegador
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (anonKey.trim()) {
      localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
  }
  // Resetear cliente en caché para recrear con nuevas credenciales
  cachedClient = null;
  lastUrl = '';
  lastKey = '';
}

/**
 * Verifica si Supabase está configurado con URL y Anon Key válidas
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
}

/**
 * Obtiene o inicializa la instancia de cliente de Supabase
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && lastUrl === config.url && lastKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUrl = config.url;
    lastKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Error al inicializar cliente Supabase:', err);
    return null;
  }
}

/**
 * Realiza un test de conexión rápido contra Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Faltan la URL o la clave anónima (Anon Key) de Supabase.' };
  }

  try {
    const { error } = await client.from('sorteo_groups').select('id').limit(1);
    if (error) {
      // Si la tabla no existe aún, avisar amablemente
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Conectó a Supabase pero la tabla "sorteo_groups" aún no ha sido creada. Ejecuta el script SQL.',
        };
      }
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }
    return { success: true, message: '¡Conexión exitosa a la base de datos Supabase!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'No fue posible contactar a Supabase.' };
  }
}
