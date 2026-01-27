import { DEFAULT_CANDIDATE_NAME } from '../constants';

/**
 * Derives a temporary display name from a URL or raw text.
 * Used immediately after scanning, before AI analysis completes.
 *
 * Examples:
 *   "https://linkedin.com/in/john-doe"        → "John Doe"
 *   "https://github.com/janedoe"              → "Janedoe"
 *   "https://drive.google.com/file/d/abc..."   → "Google Drive PDF"
 *   "https://example.com/resume_jane.pdf"      → "Resume Jane"
 *   "https://qrco.de/LasmarBelgacem"          → "Lasmar Belgacem"
 *   raw text                                   → first 30 chars
 */
export function deriveTempName(content: string): string {
  if (!content || !content.trim()) return DEFAULT_CANDIDATE_NAME;

  const trimmed = content.trim();

  // Non-URL: use first 30 characters of raw text
  if (!trimmed.startsWith('http')) {
    const snippet = trimmed.slice(0, 30).trim();
    return snippet || DEFAULT_CANDIDATE_NAME;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return DEFAULT_CANDIDATE_NAME;
  }

  const hostname = url.hostname.toLowerCase();

  // LinkedIn: extract from /in/slug
  if (hostname.includes('linkedin.com')) {
    const inMatch = url.pathname.match(/\/in\/([^/]+)/);
    if (inMatch) {
      return slugToName(inMatch[1]);
    }
  }

  // GitHub: extract username from path
  if (hostname.includes('github.com')) {
    const segments = cleanPathSegments(url.pathname);
    if (segments.length > 0) {
      return slugToName(segments[0]);
    }
  }

  // Google Drive: generic label
  if (hostname.includes('drive.google.com')) {
    return 'Google Drive PDF';
  }

  // Symplicity career services: QR codes contain only hashes, no useful name
  if (hostname.includes('symplicity.com')) {
    return 'Career Fair CV';
  }

  // PDF URL: extract filename without extension
  if (url.pathname.toLowerCase().endsWith('.pdf')) {
    const segments = cleanPathSegments(url.pathname);
    const filename = segments[segments.length - 1];
    if (filename) {
      const nameWithoutExt = filename.replace(/\.pdf$/i, '');
      return slugToName(nameWithoutExt);
    }
  }

  // QR shortlinks and other URLs: extract last meaningful path segment
  const segments = cleanPathSegments(url.pathname);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    if (last && last.length > 1) {
      return slugToName(last);
    }
  }

  return DEFAULT_CANDIDATE_NAME;
}

/** Split a URL pathname into non-empty segments */
function cleanPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(s => s.length > 0);
}

/**
 * Convert a URL slug into a human-readable name.
 * Handles: hyphens, underscores, camelCase, dots.
 *
 * "john-doe"       → "John Doe"
 * "LasmarBelgacem" → "Lasmar Belgacem"
 * "resume_jane"    → "Resume Jane"
 */
function slugToName(slug: string): string {
  // Split on camelCase boundaries: "LasmarBelgacem" → "Lasmar Belgacem"
  let spaced = slug.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace common separators with spaces
  spaced = spaced.replace(/[-_.]+/g, ' ');

  // Trim and collapse whitespace
  spaced = spaced.replace(/\s+/g, ' ').trim();

  if (!spaced) return DEFAULT_CANDIDATE_NAME;

  // Capitalize each word
  return spaced
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
