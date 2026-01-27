// Supabase Edge Function: resolve-url
// Resolves short/redirect URLs to their final destination.
// Follows HTTP 3xx redirects and HTML meta-refresh / JS redirects.
// Returns the final URL so the client can pass it to Gemini via createPartFromUri.
//
// Source: https://supabase.com/docs/guides/functions - Verified: 2026-01-27
// Source: https://docs.deno.com/api/web/~/RequestRedirect - Verified: 2026-01-27

import { corsHeaders } from '../_shared/cors.ts';

const MAX_REDIRECTS = 10;
const FETCH_TIMEOUT_MS = 15_000;

// Browser-like headers so servers (e.g. Symplicity) don't reject us
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

interface ResolveResult {
  finalUrl: string;
  redirectChain: string[];
  contentType: string | null;
  isPdf: boolean;
  error: string | null;
}

/**
 * Extract a redirect URL from an HTML page body.
 * Handles <meta http-equiv="refresh"> and JS window.location / document.location.
 */
function extractHtmlRedirect(html: string): string | null {
  // <meta http-equiv="refresh" content="0;url=https://...">
  const metaMatch = html.match(
    /content=["']\s*\d+\s*;\s*url=([^"']+)["']/i,
  );
  if (metaMatch?.[1]) return metaMatch[1];

  // window.location.href = "..." or window.location = "..."
  // document.location.href = "..." or document.location = "..."
  const jsMatch = html.match(
    /(?:window|document)\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
  );
  if (jsMatch?.[1]) return jsMatch[1];

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log('[resolve-url] Received URL:', url);

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Follow redirects manually to capture the chain ---
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
          headers: BROWSER_HEADERS,
        });
        clearTimeout(timeoutId);

        console.log(`[resolve-url] Hop ${i}: ${response.status} ${currentUrl}`);

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            const resolvedUrl = new URL(location, currentUrl).href;
            console.log(`[resolve-url] Redirect → ${resolvedUrl}`);
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
        console.error(`[resolve-url] Fetch failed at ${currentUrl}:`, fetchError);
        const result: ResolveResult = {
          finalUrl: currentUrl,
          redirectChain,
          contentType: null,
          isPdf: false,
          error: `Fetch failed at ${currentUrl}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        };
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- Check for HTML meta-refresh / JS redirects ---
    // Some servers (e.g. Symplicity) return 200 + HTML with a JS or meta redirect
    // instead of a proper 3xx.
    const contentType = finalResponse?.headers.get('content-type') || null;
    let isPdf = contentType?.includes('application/pdf') ?? false;

    if (finalResponse && !isPdf && contentType?.includes('text/html')) {
      try {
        const html = await finalResponse.text();
        const extractedUrl = extractHtmlRedirect(html);
        if (extractedUrl) {
          const resolvedUrl = new URL(extractedUrl, currentUrl).href;
          console.log(`[resolve-url] HTML redirect extracted → ${resolvedUrl}`);
          redirectChain.push(resolvedUrl);
          currentUrl = resolvedUrl;

          // Follow any further HTTP redirects from the extracted URL
          for (let i = 0; i < MAX_REDIRECTS; i++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            try {
              const response = await fetch(currentUrl, {
                redirect: 'manual',
                signal: controller.signal,
                headers: BROWSER_HEADERS,
              });
              clearTimeout(timeoutId);
              console.log(`[resolve-url] Post-HTML hop ${i}: ${response.status} ${currentUrl}`);

              if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (location) {
                  const nextUrl = new URL(location, currentUrl).href;
                  redirectChain.push(nextUrl);
                  currentUrl = nextUrl;
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
              console.error(`[resolve-url] Post-HTML fetch failed at ${currentUrl}:`, fetchError);
              break;
            }
          }

          // Re-check content type after following HTML redirect
          const newContentType = finalResponse?.headers.get('content-type') || null;
          isPdf = newContentType?.includes('application/pdf') ?? false;
        }
      } catch {
        // HTML parsing failed — non-fatal, continue with what we have
        console.warn('[resolve-url] Failed to parse HTML body for redirect');
      }
    }

    // Discard response body if it hasn't already been consumed.
    // When the text/html branch above calls finalResponse.text(), the body stream
    // becomes locked. Attempting .cancel() on a locked stream throws
    // "Cannot cancel a locked ReadableStream" — safe to ignore.
    try {
      await finalResponse?.body?.cancel();
    } catch {
      // Body already consumed (e.g., by .text() during HTML redirect extraction)
    }

    const finalContentType = finalResponse?.headers.get('content-type') || contentType;

    const result: ResolveResult = {
      finalUrl: currentUrl,
      redirectChain,
      contentType: finalContentType,
      isPdf,
      error: null,
    };

    console.log('[resolve-url] Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[resolve-url] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
