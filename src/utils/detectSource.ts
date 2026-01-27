/** Detect the type of source from QR content */
export const detectSourceType = (content: string): string => {
  if (!content.startsWith('http')) return 'raw_text';
  const lower = content.toLowerCase();
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('linkedin.com/in')) return 'linkedin';
  if (lower.includes('drive.google.com')) return 'google_drive';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'portfolio';
};

/** Source-specific analysis hints for AI prompts */
export const sourceHints: Record<string, string> = {
  github: "This is a GitHub profile. Look at their repositories, contributions, pinned projects, and bio to assess technical ability.",
  linkedin: "This is a LinkedIn profile. Extract their headline, work history, education, and skills.",
  google_drive: "This links to a Google Drive document (likely a resume PDF). If accessible, extract the resume content.",
  pdf: "This links to a PDF resume. If accessible, extract the resume content.",
  portfolio: "This is a personal website or portfolio. Look for About, Projects, Resume, and Contact sections.",
  raw_text: "This is raw text from a QR code, likely resume content or contact info. Parse it directly.",
};
