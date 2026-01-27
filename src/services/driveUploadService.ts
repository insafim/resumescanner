// Client-side service to invoke the upload-to-drive Supabase Edge Function.
// Source: https://supabase.com/docs/reference/javascript/functions-invoke - Verified: 2026-01-27
import { supabase } from './supabaseClient';

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  filename: string;
}

/**
 * Uploads a PDF from a resolved URL to Google Drive via the upload-to-drive
 * Edge Function. The Edge Function handles service account auth, PDF download,
 * and Drive upload.
 *
 * Designed for fire-and-forget usage — callers should NOT await this if they
 * want non-blocking behavior. Returns null on any failure.
 */
export async function uploadPdfToDrive(
  resolvedUrl: string,
  candidateName: string,
  candidateId: string,
): Promise<DriveUploadResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: { resolvedUrl, candidateName, candidateId },
    });

    if (error) {
      console.warn('[driveUploadService] Edge Function error:', error.message);
      return null;
    }

    console.info('[driveUploadService] Upload result:', JSON.stringify(data));
    return data as DriveUploadResult;
  } catch (err) {
    console.warn('[driveUploadService] Failed to invoke Edge Function:', err);
    return null;
  }
}
