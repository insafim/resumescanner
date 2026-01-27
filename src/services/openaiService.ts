// OpenAI AI resume analysis service (Responses API)
// SDK: openai v6.16.0
// Uses the Responses API with:
//   - web_search_preview tool for URL analysis (analogous to Gemini's googleSearch)
//   - file_url / file_data for PDF analysis (analogous to Gemini's createPartFromUri / createPartFromBase64)
//   - Structured output via text.format json_schema
//
// Source: OpenAI Responses API documentation
// https://platform.openai.com/docs/api-reference/responses
// Verified: 2026-01-28
import OpenAI from "openai";
import { AnalysisResponse } from '../types';
import { detectSourceType, sourceHints } from '../utils/detectSource';
import { openaiAnalysisSchema } from '../constants/openaiSchema';
import { AI_MODELS } from '../constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required: app runs in browser (same pattern as Groq SDK)
});

// Structured output config reused across all analysis functions.
// Source: OpenAI Structured Outputs guide
// https://platform.openai.com/docs/guides/structured-outputs
// Verified: 2026-01-28
const textFormat = {
  format: {
    type: "json_schema" as const,
    ...openaiAnalysisSchema,
  },
};

// Extract file ID from Google Drive sharing URL
const extractDriveFileId = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const analyzeResumeContent = async (qrContent: string): Promise<AnalysisResponse> => {
  const sourceType = detectSourceType(qrContent);

  const prompt = `
You are a recruiter's assistant at a university career fair. A student's QR code has been scanned.
The QR content is: "${qrContent}"
Source type: ${sourceType}. ${sourceHints[sourceType]}

TASK: Extract structured information about this candidate for a recruiter to quickly evaluate.

Instructions:
1. Read and extract information from the provided URL directly.
2. Extract as much of the following as you can find. Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

Required fields:
- name: Full name (use "Unknown Candidate" only if truly not findable)
- summary: 2-3 sentence professional summary oriented toward a recruiter
- keyPoints: Array of the most notable skills, achievements, or qualifications (max 8)
- urls: Array of relevant profile/project URLs found

Optional fields (fill if available):
- educationLevel: Highest degree (e.g., "PhD", "Masters", "Bachelors", "Associate")
- educationField: Field of study (e.g., "Computer Science", "Electrical Engineering")
- educationUniversity: University name
- educationDetails: Additional education notes (GPA, honors, relevant coursework)
- experienceSummary: 1-2 sentence overview of work experience
- yearsOfExperience: Estimated total years of professional experience (integer)
- previousRoles: Array of {title, company, duration} for past positions (max 5)
- technicalSkills: Array of specific technologies, languages, or tools
- projects: Array of {name, description, url} for notable projects (max 5)
- overallAssessment: 2-3 sentence recruiter-oriented evaluation of the candidate's strengths and fit
- sourceType: "${sourceType}"

Return the response as JSON.
  `;

  // Responses API with web_search_preview — analogous to Gemini's googleSearch tool.
  // Source: https://platform.openai.com/docs/guides/tools-web-search
  // Verified: 2026-01-28
  const response = await openai.responses.create({
    model: AI_MODELS.OPENAI,
    tools: [{ type: "web_search_preview" }],
    input: prompt,
    text: textFormat,
  });

  const text = response.output_text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  // Post-processing: same pattern as geminiService.ts
  if (!data.sourceType) data.sourceType = sourceType;
  if (qrContent.startsWith('http')) {
    if (!data.urls) data.urls = [];
    if (!data.urls.includes(qrContent)) data.urls.push(qrContent);
  }
  if (!data.urls) data.urls = [];

  return data;
};

// Analyze a Google Drive PDF by passing the download URL to OpenAI via file_url.
// OpenAI's server fetches the URL (no CORS issue from the browser), analogous
// to Gemini's createPartFromUri.
// Source: OpenAI File Inputs documentation
// https://platform.openai.com/docs/guides/pdf-files
// Verified: 2026-01-28
export const analyzeGoogleDrivePdf = async (driveUrl: string): Promise<AnalysisResponse> => {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) throw new Error("Could not extract file ID from Google Drive URL");

  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const prompt = `You are a recruiter's assistant at a university career fair.
This PDF is a candidate's resume. Extract structured information for a recruiter to quickly evaluate.
Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

Required fields:
- name: Full name (use "Unknown Candidate" only if truly not findable)
- summary: 2-3 sentence professional summary oriented toward a recruiter
- keyPoints: Array of the most notable skills, achievements, or qualifications (max 8)
- urls: Array of relevant profile/project URLs found in the resume

Optional fields (fill if available):
- educationLevel, educationField, educationUniversity, educationDetails
- experienceSummary, yearsOfExperience
- previousRoles: Array of {title, company, duration}
- technicalSkills: Array of specific technologies, languages, or tools
- projects: Array of {name, description, url}
- overallAssessment: 2-3 sentence recruiter-oriented evaluation
- sourceType: "google_drive"

Return the response as JSON.`;

  const response = await openai.responses.create({
    model: AI_MODELS.OPENAI,
    input: [
      {
        role: "user" as const,
        content: [
          { type: "input_file" as const, file_url: directUrl },
          { type: "input_text" as const, text: prompt },
        ],
      },
    ],
    text: textFormat,
  });

  const text = response.output_text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "google_drive";
  if (!data.urls) data.urls = [];
  if (!data.urls.includes(driveUrl)) data.urls.push(driveUrl);

  return data;
};

// Analyze a PDF stored in Supabase Storage by passing its base64 content
// directly to OpenAI via file_data (analogous to Gemini's createPartFromBase64).
// Source: OpenAI File Inputs documentation
// https://platform.openai.com/docs/guides/pdf-files
// Verified: 2026-01-28
export const analyzeStoredPdf = async (
  pdfBase64: string,
  originalUrl: string
): Promise<AnalysisResponse> => {
  const prompt = `You are a recruiter's assistant at a university career fair.
This PDF is a candidate's resume. Extract structured information for a recruiter to quickly evaluate.
Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

Required fields:
- name: Full name (use "Unknown Candidate" only if truly not findable)
- summary: 2-3 sentence professional summary oriented toward a recruiter
- keyPoints: Array of the most notable skills, achievements, or qualifications (max 8)
- urls: Array of relevant profile/project URLs found in the resume

Optional fields (fill if available):
- educationLevel, educationField, educationUniversity, educationDetails
- experienceSummary, yearsOfExperience
- previousRoles: Array of {title, company, duration}
- technicalSkills: Array of specific technologies, languages, or tools
- projects: Array of {name, description, url}
- overallAssessment: 2-3 sentence recruiter-oriented evaluation
- sourceType: "pdf"

Return the response as JSON.`;

  const response = await openai.responses.create({
    model: AI_MODELS.OPENAI,
    input: [
      {
        role: "user" as const,
        content: [
          {
            type: "input_file" as const,
            file_data: `data:application/pdf;base64,${pdfBase64}`,
          },
          { type: "input_text" as const, text: prompt },
        ],
      },
    ],
    text: textFormat,
  });

  const text = response.output_text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "pdf";
  if (!data.urls) data.urls = [];
  if (originalUrl && !data.urls.includes(originalUrl)) {
    data.urls.push(originalUrl);
  }

  return data;
};

// Analyze a PDF at a resolved URL by passing it to OpenAI via file_url.
// OpenAI's server fetches the PDF (no CORS issue), analogous to Gemini's createPartFromUri.
// Used when the Edge Function resolves a redirect chain to a direct PDF URL (e.g. S3 pre-signed).
// Source: OpenAI File Inputs documentation
// https://platform.openai.com/docs/guides/pdf-files
// Verified: 2026-01-28
export const analyzeResolvedPdf = async (
  pdfUrl: string,
  originalUrl: string
): Promise<AnalysisResponse> => {
  const prompt = `You are a recruiter's assistant at a university career fair.
This PDF is a candidate's resume. Extract structured information for a recruiter to quickly evaluate.
Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

Required fields:
- name: Full name (use "Unknown Candidate" only if truly not findable)
- summary: 2-3 sentence professional summary oriented toward a recruiter
- keyPoints: Array of the most notable skills, achievements, or qualifications (max 8)
- urls: Array of relevant profile/project URLs found in the resume

Optional fields (fill if available):
- educationLevel, educationField, educationUniversity, educationDetails
- experienceSummary, yearsOfExperience
- previousRoles: Array of {title, company, duration}
- technicalSkills: Array of specific technologies, languages, or tools
- projects: Array of {name, description, url}
- overallAssessment: 2-3 sentence recruiter-oriented evaluation
- sourceType: "pdf"

Return the response as JSON.`;

  const response = await openai.responses.create({
    model: AI_MODELS.OPENAI,
    input: [
      {
        role: "user" as const,
        content: [
          { type: "input_file" as const, file_url: pdfUrl },
          { type: "input_text" as const, text: prompt },
        ],
      },
    ],
    text: textFormat,
  });

  const text = response.output_text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "pdf";
  if (!data.urls) data.urls = [];
  if (originalUrl && !data.urls.includes(originalUrl)) {
    data.urls.push(originalUrl);
  }

  return data;
};
