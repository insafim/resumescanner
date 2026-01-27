export interface Candidate {
  id: string;
  qr_content: string;
  scanned_at: string;
  created_at?: string;
  updated_at?: string;

  // Recruiter fields
  status: 'pending' | 'go' | 'no-go';
  notes: string;

  // AI analysis
  analysis_status: 'pending' | 'processing' | 'complete' | 'failed';
  analysis_error?: string;
  name: string;
  ai_analysis?: AnalysisResponse;
}

// Structured response from Gemini AI analysis
export interface AnalysisResponse {
  name: string;
  summary: string;
  keyPoints: string[];
  urls: string[];
  educationLevel?: string;
  educationField?: string;
  educationUniversity?: string;
  educationDetails?: string;
  experienceSummary?: string;
  yearsOfExperience?: number;
  previousRoles?: { title: string; company: string; duration?: string }[];
  technicalSkills?: string[];
  projects?: { name: string; description: string; url?: string }[];
  overallAssessment?: string;
  sourceType?: string;
}

// Global definition for jsQR loaded via CDN
declare global {
  interface Window {
    jsQR: (
      data: Uint8ClampedArray,
      width: number,
      height: number,
      options?: { inversionAttempts: string }
    ) => { data: string; location: any } | null;
  }
}
