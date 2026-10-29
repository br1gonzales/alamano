import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zdokhqykdsbyxzwivjbm.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkb2tocXlrZHNieXh6d2l2amJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4Mzc0OTAsImV4cCI6MjEwNTQxMzQ5MH0.mEmGbNCxRvYlAKytIQcwtEZ8bakJXJlSW347ucXntd4';

// Resilient clock skew retry wrapper
const fetchWithClockSkewRetry: typeof fetch = async (input, init) => {
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(input, init);

    if (response.status === 401) {
      try {
        const cloned = response.clone();
        const json = await cloned.json();
        if (
          json?.code === 'PGRST303' ||
          (typeof json?.message === 'string' &&
            json.message.toLowerCase().includes('jwt issued at future'))
        ) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 600));
          continue;
        }
      } catch {
        // Response was not JSON, return normally
      }
    }

    return response;
  }

  return fetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    fetch: fetchWithClockSkewRetry,
  },
});
