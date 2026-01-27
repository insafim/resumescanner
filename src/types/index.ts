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

  // Pipeline tracking (Phase 1)
  temp_name?: string;
  source_type?: string;
  pipeline_step?: 'url_saved' | 'name_derived' | 'url_resolved' | 'analysis_running' | 'complete' | 'failed';

  // URL resolution (Phase 2)
  resolved_url?: string;
  pdf_storage_path?: string;

  // Recruiter-set fields
  candidate_number?: number;
  degree_type?: 'bachelors' | 'masters' | 'phd';
  job_type?: 'internship' | 'full_time';
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
