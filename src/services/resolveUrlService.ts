// Client-side service to invoke the resolve-url Supabase Edge Function.
// Source: https://supabase.com/docs/reference/javascript/functions-invoke - Verified: 2026-01-27
import { supabase } from './supabaseClient';

export interface ResolveUrlResult {
  finalUrl: string;
  redirectChain: string[];
  contentType: string | null;
  isPdf: boolean;
  error: string | null;
}

/**
 * Resolves a short/redirect URL to its final destination via Supabase Edge Function.
 * The Edge Function follows HTTP 3xx redirects and HTML meta-refresh/JS redirects,
 * returning the final URL. If it's a PDF, Gemini can fetch it via createPartFromUri.
 *
 * Returns null if the Edge Function is unavailable or the call fails — the caller
 * should fall back to using the original URL.
 */
export async function resolveUrl(url: string): Promise<ResolveUrlResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('resolve-url', {
      body: { url },
    });

    if (error) {
      console.warn('[resolveUrlService] Edge Function error:', error.message);
      return null;
    }

    console.info('[resolveUrlService] Result:', JSON.stringify(data));
    return data as ResolveUrlResult;
  } catch (err) {
    console.warn('[resolveUrlService] Failed to invoke Edge Function:', err);
    return null;
  }
}
