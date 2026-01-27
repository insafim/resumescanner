// Supabase Edge Function: upload-to-drive
// Downloads a PDF from a resolved URL and uploads it to a Google Drive folder
// using OAuth 2.0 refresh token for authentication (personal Drive).
//
// Source: https://developers.google.com/identity/protocols/oauth2/web-server#httprest_3 - Verified: 2026-01-28
// Source: https://developers.google.com/workspace/drive/api/guides/manage-uploads - Verified: 2026-01-27
// Source: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create - Verified: 2026-01-27

import { corsHeaders } from '../_shared/cors.ts';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB — Google Drive multipart upload limit

// --- OAuth 2.0 refresh token exchange ---

// Source: https://developers.google.com/identity/protocols/oauth2/web-server#httprest_3
// Exchange a stored refresh token for a short-lived access token.
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Token refresh failed (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  return data.access_token;
}

// --- PDF download ---

async function downloadPdf(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(
        `PDF download failed: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PDF_SIZE) {
      throw new Error(
        `PDF too large (${arrayBuffer.byteLength} bytes, max ${MAX_PDF_SIZE})`,
      );
    }

    return arrayBuffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- Google Drive multipart upload ---

// Source: https://developers.google.com/workspace/drive/api/guides/manage-uploads#multipart
// Multipart upload sends metadata + file content in a single multipart/related request.
async function uploadToDrive(
  accessToken: string,
  pdfBytes: ArrayBuffer,
  filename: string,
  folderId: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: [folderId],
  };

  const boundary = '===resumescanner_boundary===';
  const metadataJson = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const pdfArray = new Uint8Array(pdfBytes);

  // Build multipart/related body: metadata part + PDF binary part
  const preamble = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadataJson}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/pdf\r\n\r\n`,
  );
  const postamble = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(
    preamble.length + pdfArray.length + postamble.length,
  );
  body.set(preamble, 0);
  body.set(pdfArray, preamble.length);
  body.set(postamble, preamble.length + pdfArray.length);

  // Source: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Drive upload failed (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink,
  };
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { resolvedUrl, candidateName, candidateId, candidateNumber } = await req.json();
    console.log('[upload-to-drive] Request:', { resolvedUrl, candidateName, candidateId, candidateNumber });

    if (!resolvedUrl || typeof resolvedUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "resolvedUrl" field' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Read OAuth secrets
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN');
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      console.error('[upload-to-drive] Missing secrets: check GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID');
      return new Response(
        JSON.stringify({ error: 'Google Drive integration not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 1. Get access token via refresh token
    console.log('[upload-to-drive] Refreshing access token...');
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // 2. Download PDF from resolved URL
    console.log('[upload-to-drive] Downloading PDF from:', resolvedUrl);
    const pdfBytes = await downloadPdf(resolvedUrl);
    console.log(`[upload-to-drive] Downloaded ${pdfBytes.byteLength} bytes`);

    // 3. Upload to Google Drive
    const padded = String(candidateNumber ?? 0).padStart(3, '0');
    const filename = `MBZUAI_Candidate_${padded}.pdf`;

    console.log('[upload-to-drive] Uploading to Drive as:', filename);
    const { fileId, webViewLink } = await uploadToDrive(
      accessToken,
      pdfBytes,
      filename,
      folderId,
    );

    console.log(`[upload-to-drive] Success: ${filename} -> ${webViewLink}`);

    return new Response(
      JSON.stringify({ fileId, webViewLink, filename }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[upload-to-drive] Error:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
