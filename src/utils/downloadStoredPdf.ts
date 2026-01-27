// Downloads a stored PDF from Supabase Storage and returns its base64 representation.
// Source: https://supabase.com/docs/reference/javascript/storage-from-download - Verified: 2026-01-27
import { supabase } from '../services/supabaseClient';

export interface StoredPdfResult {
  base64: string;
  mimeType: 'application/pdf';
}

/**
 * Downloads a PDF from the MBZUAI-CVs Supabase Storage bucket and returns
 * its content as a base64-encoded string suitable for passing to AI providers.
 *
 * Returns null on failure (caller should fall back to URL-based analysis).
 */
export async function downloadStoredPdf(storagePath: string): Promise<StoredPdfResult | null> {
  try {
    const { data, error } = await supabase.storage
      .from('MBZUAI-CVs')
      .download(storagePath);

    if (error || !data) {
      console.warn('[downloadStoredPdf] Failed to download PDF:', error?.message);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    return { base64, mimeType: 'application/pdf' };
  } catch (err) {
    console.warn('[downloadStoredPdf] Unexpected error:', err);
    return null;
  }
}
