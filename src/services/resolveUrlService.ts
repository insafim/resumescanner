// Client-side service to invoke the resolve-url Supabase Edge Function.
// Source: https://supabase.com/docs/reference/javascript/functions-invoke - Verified: 2026-01-27
import { supabase } from './supabaseClient';

export interface ResolveUrlResult {
  finalUrl: string;
  redirectChain: string[];
  contentType: string | null;
  isPdf: boolean;
  storagePath: string | null;
  error: string | null;
}

/**
 * Resolves a short/redirect URL to its final destination via Supabase Edge Function.
 * If the final URL points to a PDF, the Edge Function downloads and stores it
 * in the `MBZUAI-CVs` storage bucket.
 *
 * Returns null if the Edge Function is unavailable or the call fails — the caller
 * should fall back to using the original URL.
 */
export async function resolveUrl(url: string, candidateId: string): Promise<ResolveUrlResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('resolve-url', {
      body: { url, candidateId },
    });

    if (error) {
      console.warn('[resolveUrlService] Edge Function error:', error.message);
      return null;
    }

    return data as ResolveUrlResult;
  } catch (err) {
    console.warn('[resolveUrlService] Failed to invoke Edge Function:', err);
    return null;
  }
}
