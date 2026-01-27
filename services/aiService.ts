// AI provider adapter - switches between Gemini and Groq based on AI_PROVIDER env var.
// Default: "gemini" (preserves existing behavior).
// Set AI_PROVIDER=groq in .env.local to use Groq.
//
// Special case: Google Drive PDFs always route to Gemini, which can read
// PDFs natively via createPartFromUri (Groq cannot access Drive content).
import { AnalysisResponse } from '../types';
import { analyzeResumeContent as geminiAnalyze, analyzeGoogleDrivePdf } from './geminiService';
import { analyzeResumeContent as groqAnalyze } from './groqService';

const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const isGoogleDriveUrl = (content: string): boolean =>
  content.toLowerCase().includes('drive.google.com');

export const analyzeResumeContent = async (qrContent: string): Promise<AnalysisResponse> => {
  // Google Drive PDFs → always Gemini (can read PDFs natively)
  if (isGoogleDriveUrl(qrContent)) {
    return analyzeGoogleDrivePdf(qrContent);
  }

  if (provider === 'groq') {
    return groqAnalyze(qrContent);
  }
  return geminiAnalyze(qrContent);
};
