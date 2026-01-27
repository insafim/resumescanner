// Supabase Edge Function: resolve-url
// Resolves short/redirect URLs to their final destination.
// If the final URL is a PDF, downloads it and stores in Supabase Storage.
//
// Source: https://supabase.com/docs/guides/functions - Verified: 2026-01-27
// Source: https://docs.deno.com/api/web/~/RequestRedirect - Verified: 2026-01-27

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_REDIRECTS = 10;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

interface ResolveResult {
  finalUrl: string;
  redirectChain: string[];
  contentType: string | null;
  isPdf: boolean;
  storagePath: string | null;
  error: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, candidateId } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Step 1: Follow redirects manually to capture the chain ---
    const redirectChain: string[] = [url];
    let currentUrl = url;
    let finalResponse: Response | null = null;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'ResumeScanner/1.0 (Supabase Edge Function)',
          },
        });
        clearTimeout(timeoutId);

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            const resolvedUrl = new URL(location, currentUrl).href;
            redirectChain.push(resolvedUrl);
            currentUrl = resolvedUrl;
            await response.body?.cancel();
          } else {
            finalResponse = response;
            break;
          }
        } else {
          finalResponse = response;
          break;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // If redirect resolution fails, return what we have so far
        const result: ResolveResult = {
          finalUrl: currentUrl,
          redirectChain,
          contentType: null,
          isPdf: false,
          storagePath: null,
          error: `Fetch failed at ${currentUrl}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        };
        return new Response(JSON.stringify(result), {
          status: 200, // Return 200 with error info — client handles gracefully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const contentType = finalResponse?.headers.get('content-type') || null;
    const isPdf = contentType?.includes('application/pdf') ?? false;

    let storagePath: string | null = null;

    // --- Step 2: If PDF, download and store in Supabase Storage ---
    if (isPdf && finalResponse && candidateId) {
      try {
        const contentLength = finalResponse.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        if (size > MAX_PDF_SIZE) {
          // Skip storage — too large
          console.warn(`PDF too large (${size} bytes), skipping storage.`);
        } else {
          const pdfBlob = await finalResponse.blob();

          if (pdfBlob.size <= MAX_PDF_SIZE) {
            const supabaseAdmin = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            );

            const timestamp = Date.now();
            const safeName = currentUrl
              .split('/')
              .pop()
              ?.replace(/[^a-zA-Z0-9._-]/g, '_')
              ?.slice(0, 100) || 'resume';
            const fileName = `${candidateId}/${timestamp}_${safeName}`;

            const { data, error } = await supabaseAdmin.storage
              .from('MBZUAI-CVs')
              .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '86400',
                upsert: false,
              });

            if (error) {
              console.error('Storage upload failed:', error.message);
            } else {
              storagePath = data.path;
            }
          }
        }
      } catch (storageError) {
        console.error('PDF storage error:', storageError);
        // Non-fatal — continue without storage
      }
    } else if (finalResponse) {
      // Not a PDF — discard body
      await finalResponse.body?.cancel();
    }

    const result: ResolveResult = {
      finalUrl: currentUrl,
      redirectChain,
      contentType,
      isPdf,
      storagePath,
      error: null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
