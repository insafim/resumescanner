import { GoogleGenAI, createPartFromUri, createPartFromBase64 } from "@google/genai";
import { AnalysisResponse } from '../types';
import { detectSourceType, sourceHints } from '../utils/detectSource';
import { analysisResponseSchema } from '../constants/aiSchema';
import { AI_MODELS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const response = await ai.models.generateContent({
    model: AI_MODELS.GEMINI,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
    },
  });

  const text = response.text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  // Ensure sourceType is set
  if (!data.sourceType) data.sourceType = sourceType;

  // Add the original URL if not already present
  if (qrContent.startsWith('http')) {
    if (!data.urls) data.urls = [];
    if (!data.urls.includes(qrContent)) data.urls.push(qrContent);
  }

  if (!data.urls) data.urls = [];

  return data;
};

// Analyze a Google Drive PDF by passing the file directly to Gemini.
// Gemini's API server fetches the URL (no CORS issue from the browser).
export const analyzeGoogleDrivePdf = async (driveUrl: string): Promise<AnalysisResponse> => {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) throw new Error("Could not extract file ID from Google Drive URL");

  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const pdfPart = createPartFromUri(directUrl, "application/pdf");

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

  const response = await ai.models.generateContent({
    model: AI_MODELS.GEMINI,
    contents: [pdfPart, prompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
    },
  });

  const text = response.text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "google_drive";
  if (!data.urls) data.urls = [];
  if (!data.urls.includes(driveUrl)) data.urls.push(driveUrl);

  return data;
};

// Analyze a PDF stored in Supabase Storage by passing its base64 content
// directly to Gemini via createPartFromBase64 (no server-side fetch needed).
// Source: @google/genai createPartFromBase64(data, mimeType) - Verified: 2026-01-27
export const analyzeStoredPdf = async (
  pdfBase64: string,
  originalUrl: string
): Promise<AnalysisResponse> => {
  const pdfPart = createPartFromBase64(pdfBase64, "application/pdf");

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

  const response = await ai.models.generateContent({
    model: AI_MODELS.GEMINI,
    contents: [pdfPart, prompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisResponseSchema,
    },
  });

  const text = response.text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "pdf";
  if (!data.urls) data.urls = [];
  if (originalUrl && !data.urls.includes(originalUrl)) {
    data.urls.push(originalUrl);
  }

  return data;
};
