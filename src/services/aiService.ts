// AI provider adapter - switches between Gemini and Groq based on AI_PROVIDER env var.
// Default: "gemini" (preserves existing behavior).
// Set AI_PROVIDER=groq in .env.local to use Groq.
//
// Special case: Google Drive PDFs always route to Gemini, which can read
// PDFs natively via createPartFromUri (Groq cannot access Drive content).
//
// Retry: All calls are wrapped with exponential backoff (3 attempts) to
// handle transient 503/429 errors from model providers.
import { AnalysisResponse } from '../types';
import { analyzeResumeContent as geminiAnalyze, analyzeGoogleDrivePdf, analyzeStoredPdf } from './geminiService';
import { analyzeResumeContent as groqAnalyze } from './groqService';

/** Context for a PDF already stored in Supabase Storage. */
export interface PdfContext {
  pdfBase64: string;
  originalUrl: string;
}

const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/** Rejects if the given promise does not settle within `ms` milliseconds. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);
};

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // 503 Service Unavailable / model overloaded
    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')) return true;
    // 429 Too Many Requests / rate limit
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('rate_limit')) return true;
    // Network-level transient failures
    if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('fetch failed')) return true;
    // Request hung and was killed by withTimeout
    if (msg.includes('timed out')) return true;
  }
  // Check for status code on error objects from SDKs (Groq, Google GenAI)
  const err = error as Record<string, unknown>;
  if (typeof err?.status === 'number' && (err.status === 503 || err.status === 429)) return true;
  if (typeof err?.code === 'number' && (err.code === 503 || err.code === 429)) return true;
  return false;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      // Exponential backoff with jitter: base * 2^attempt + random(0-500ms)
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(
        `[aiService] Attempt ${attempt + 1}/${MAX_RETRIES} failed (retryable). Retrying in ${Math.round(delay)}ms...`,
        error instanceof Error ? error.message : error
      );
      await sleep(delay);
    }
  }
  throw lastError;
};

const isGoogleDriveUrl = (content: string): boolean =>
  content.toLowerCase().includes('drive.google.com');

export const analyzeResumeContent = async (
  qrContent: string,
  pdfContext?: PdfContext
): Promise<AnalysisResponse> => {
  // Google Drive PDFs → always Gemini (can read PDFs natively via createPartFromUri)
  if (isGoogleDriveUrl(qrContent)) {
    return withRetry(() => withTimeout(analyzeGoogleDrivePdf(qrContent), REQUEST_TIMEOUT_MS));
  }

  // Stored PDF available → pass directly to Gemini via base64 (skips URL re-fetch)
  if (pdfContext) {
    if (provider === 'groq') {
      // Groq cannot ingest PDFs natively; fall through to URL-based analysis.
      console.info('[aiService] Stored PDF available but Groq cannot ingest PDFs. Using URL-based analysis.');
    } else {
      return withRetry(() =>
        withTimeout(analyzeStoredPdf(pdfContext.pdfBase64, pdfContext.originalUrl), REQUEST_TIMEOUT_MS)
      );
    }
  }

  // Default: URL-based analysis
  if (provider === 'groq') {
    return withRetry(() => withTimeout(groqAnalyze(qrContent), REQUEST_TIMEOUT_MS));
  }
  return withRetry(() => withTimeout(geminiAnalyze(qrContent), REQUEST_TIMEOUT_MS));
};
