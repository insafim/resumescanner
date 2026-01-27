// Supabase Edge Function: upload-to-drive
// Downloads a PDF from a resolved URL and uploads it to a Google Drive folder
// using a service account for authentication.
//
// Source: https://developers.google.com/identity/protocols/oauth2/service-account - Verified: 2026-01-27
// Source: https://developers.google.com/workspace/drive/api/guides/manage-uploads - Verified: 2026-01-27
// Source: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create - Verified: 2026-01-27

import { corsHeaders } from '../_shared/cors.ts';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB — Google Drive multipart upload limit

// --- JWT helpers ---

// Source: https://developers.google.com/identity/protocols/oauth2/service-account#httprest
// JWT must be signed with RS256 using the service account's PKCS#8 private key.

function base64url(data: string | ArrayBuffer): string {
  let base64: string;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import a PEM-encoded PKCS#8 private key for RS256 signing.
 * Google service account JSON always provides PKCS#8 format ("BEGIN PRIVATE KEY").
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Source: crypto.subtle.importKey with PKCS#8 for RSASSA-PKCS1-v1_5
  // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
  return crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/**
 * Create a signed JWT for Google service account authentication.
 * Source: https://developers.google.com/identity/protocols/oauth2/service-account#httprest
 */
async function createSignedJwt(
  serviceEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKeyPem);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64url(
    JSON.stringify({
      iss: serviceEmail,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  );

  const unsignedToken = `${header}.${claims}`;
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken),
  );

  return `${unsignedToken}.${base64url(signature)}`;
}

// --- Google OAuth2 token exchange ---

async function getAccessToken(jwt: string): Promise<string> {
  // Source: https://developers.google.com/identity/protocols/oauth2/service-account#httprest
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Token exchange failed (${response.status}): ${errorBody}`,
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
    const { resolvedUrl, candidateName, candidateId } = await req.json();
    console.log('[upload-to-drive] Request:', { resolvedUrl, candidateName, candidateId });

    if (!resolvedUrl || typeof resolvedUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "resolvedUrl" field' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Read secrets
    const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const rawPrivateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');

    if (!serviceEmail || !rawPrivateKey || !folderId) {
      console.error('[upload-to-drive] Missing secrets: check GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID');
      return new Response(
        JSON.stringify({ error: 'Google Drive integration not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Handle escaped newlines in private key from env vars
    const privateKeyPem = rawPrivateKey.replace(/\\n/g, '\n');

    // 1. Create signed JWT
    console.log('[upload-to-drive] Creating JWT...');
    const jwt = await createSignedJwt(serviceEmail, privateKeyPem);

    // 2. Exchange for access token
    console.log('[upload-to-drive] Exchanging JWT for access token...');
    const accessToken = await getAccessToken(jwt);

    // 3. Download PDF from resolved URL
    console.log('[upload-to-drive] Downloading PDF from:', resolvedUrl);
    const pdfBytes = await downloadPdf(resolvedUrl);
    console.log(`[upload-to-drive] Downloaded ${pdfBytes.byteLength} bytes`);

    // 4. Upload to Google Drive
    const safeName = (candidateName || 'Unknown')
      .replace(/[^a-zA-Z0-9_\- ]/g, '_')
      .slice(0, 80);
    const timestamp = new Date().toISOString().slice(0, 10);
    const shortId = (candidateId || 'unknown').slice(0, 8);
    const filename = `${safeName}_${timestamp}_${shortId}.pdf`;

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
