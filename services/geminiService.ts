import { GoogleGenAI, Type, createPartFromUri } from "@google/genai";
import { AnalysisResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Detect URL type to tailor the prompt
const detectSourceType = (content: string): string => {
  if (!content.startsWith('http')) return 'raw_text';
  const lower = content.toLowerCase();
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('linkedin.com/in')) return 'linkedin';
  if (lower.includes('drive.google.com')) return 'google_drive';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'portfolio';
};

// Extract file ID from Google Drive sharing URL
const extractDriveFileId = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const analyzeResumeContent = async (qrContent: string): Promise<AnalysisResponse> => {
  const sourceType = detectSourceType(qrContent);
  const modelId = "gemini-3-flash-preview";

  const sourceHints: Record<string, string> = {
    github: "This is a GitHub profile. Look at their repositories, contributions, pinned projects, and bio to assess technical ability.",
    linkedin: "This is a LinkedIn profile. Extract their headline, work history, education, and skills.",
    google_drive: "This links to a Google Drive document (likely a resume PDF). If accessible, extract the resume content.",
    pdf: "This links to a PDF resume. If accessible, extract the resume content.",
    portfolio: "This is a personal website or portfolio. Look for About, Projects, Resume, and Contact sections.",
    raw_text: "This is raw text from a QR code, likely resume content or contact info. Parse it directly.",
  };

  const prompt = `
You are a recruiter's assistant at a university career fair. A student's QR code has been scanned.
The QR content is: "${qrContent}"
Source type: ${sourceType}. ${sourceHints[sourceType]}

TASK: Extract structured information about this candidate for a recruiter to quickly evaluate.

Instructions:
1. If this is a URL, use your search tools to find publicly available information.
2. If the page links to other profiles (e.g., a portfolio linking to GitHub), follow those links too.
3. Extract as much of the following as you can find. Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

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
    model: modelId,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          urls: { type: Type.ARRAY, items: { type: Type.STRING } },
          educationLevel: { type: Type.STRING },
          educationField: { type: Type.STRING },
          educationUniversity: { type: Type.STRING },
          educationDetails: { type: Type.STRING },
          experienceSummary: { type: Type.STRING },
          yearsOfExperience: { type: Type.INTEGER },
          previousRoles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                duration: { type: Type.STRING },
              },
              required: ["title", "company"],
            },
          },
          technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
              },
              required: ["name", "description"],
            },
          },
          overallAssessment: { type: Type.STRING },
          sourceType: { type: Type.STRING },
        },
        required: ["name", "summary", "keyPoints"],
      },
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
    model: "gemini-3-flash-preview",
    contents: [pdfPart, prompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          urls: { type: Type.ARRAY, items: { type: Type.STRING } },
          educationLevel: { type: Type.STRING },
          educationField: { type: Type.STRING },
          educationUniversity: { type: Type.STRING },
          educationDetails: { type: Type.STRING },
          experienceSummary: { type: Type.STRING },
          yearsOfExperience: { type: Type.INTEGER },
          previousRoles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                duration: { type: Type.STRING },
              },
              required: ["title", "company"],
            },
          },
          technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
              },
              required: ["name", "description"],
            },
          },
          overallAssessment: { type: Type.STRING },
          sourceType: { type: Type.STRING },
        },
        required: ["name", "summary", "keyPoints"],
      },
    },
  });

  const text = response.text || "{}";
  const data = JSON.parse(text) as AnalysisResponse;

  if (!data.sourceType) data.sourceType = "google_drive";
  if (!data.urls) data.urls = [];
  if (!data.urls.includes(driveUrl)) data.urls.push(driveUrl);

  return data;
};
