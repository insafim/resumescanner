/** Application view states for navigation */
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  REVIEW = 'REVIEW',
  EDIT = 'EDIT',
}

/** Debounce delay for auto-saving recruiter notes (ms) */
export const NOTES_AUTOSAVE_DELAY_MS = 500;

/** Debounce delay between consecutive QR scans (ms) */
export const SCAN_DEBOUNCE_MS = 500;

/** Default name for candidates before AI analysis completes */
export const DEFAULT_CANDIDATE_NAME = 'Unknown Candidate';

/** AI model identifiers */
export const AI_MODELS = {
  GEMINI: 'gemini-3-flash-preview',
  GROQ_COMPOUND: 'groq/compound',
  GROQ_STRUCTURED: 'llama-3.3-70b-versatile',
} as const;
