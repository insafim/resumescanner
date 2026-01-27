// Groq AI resume analysis service
// SDK: groq-sdk v0.37.0
// Two-step approach:
//   1. groq/compound (has built-in web search) fetches and analyzes URLs
//   2. llama-3.3-70b-versatile structures the output as JSON
// For raw text (non-URL), step 1 is skipped.
import Groq from "groq-sdk";
import { AnalysisResponse } from '../types';
import { detectSourceType, sourceHints } from '../utils/detectSource';
import { AI_MODELS } from '../constants';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });

const jsonSchema = `{
  "name": "string (Full name, use 'Unknown Candidate' only if truly not findable)",
  "summary": "string (2-3 sentence professional summary oriented toward a recruiter)",
  "keyPoints": ["string (most notable skills/achievements/qualifications, max 8)"],
  "urls": ["string (relevant profile/project URLs found)"],
  "educationLevel": "string (Highest degree, e.g. PhD, Masters, Bachelors, Associate)",
  "educationField": "string (Field of study)",
  "educationUniversity": "string (University name)",
  "educationDetails": "string (Additional education notes)",
  "experienceSummary": "string (1-2 sentence overview of work experience)",
  "yearsOfExperience": 0,
  "previousRoles": [{"title": "string", "company": "string", "duration": "string"}],
  "technicalSkills": ["string (specific technologies, languages, or tools)"],
  "projects": [{"name": "string", "description": "string", "url": "string"}],
  "overallAssessment": "string (2-3 sentence recruiter-oriented evaluation)",
  "sourceType": "string"
}`;

// Step 1: Use groq/compound to fetch and analyze URL content
const fetchWithCompound = async (qrContent: string, sourceType: string): Promise<string> => {
  const response = await groq.chat.completions.create({
    model: AI_MODELS.GROQ_COMPOUND,
    messages: [
      {
        role: "system",
        content: "You are a recruiter's research assistant. Visit the provided URL and extract ALL available information about this person: name, bio, skills, work experience, education, projects, contact info. Be thorough."
      },
      {
        role: "user",
        content: `Visit this URL and extract all resume/profile information you can find.\nURL: ${qrContent}\nSource type: ${sourceType}. ${sourceHints[sourceType]}`
      }
    ],
    temperature: 0.3,
    max_completion_tokens: 4096,
  });

  return response.choices[0]?.message?.content || "";
};

// Step 2: Structure raw text into JSON using llama-3.3-70b-versatile
const structureAsJson = async (rawInfo: string, qrContent: string, sourceType: string): Promise<AnalysisResponse> => {
  const prompt = `You are a recruiter's assistant at a university career fair. A student's QR code has been scanned.
The QR content is: "${qrContent}"
Source type: ${sourceType}. ${sourceHints[sourceType]}

Here is the information gathered about this candidate:
---
${rawInfo}
---

TASK: Structure this information into a JSON object for a recruiter to quickly evaluate.
Leave fields blank (empty string or empty array) if not found — do NOT fabricate information.

You MUST respond with a JSON object matching this exact schema:
${jsonSchema}

Return ONLY the JSON object, no additional text.`;

  const response = await groq.chat.completions.create({
    model: AI_MODELS.GROQ_STRUCTURED,
    messages: [
      {
        role: "system",
        content: "You are a resume analysis assistant. Always respond with valid JSON matching the requested schema."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_completion_tokens: 8192,
    stream: false,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const text = jsonMatch ? jsonMatch[0] : "{}";
  return JSON.parse(text) as AnalysisResponse;
};

export const analyzeResumeContent = async (qrContent: string): Promise<AnalysisResponse> => {
  const sourceType = detectSourceType(qrContent);
  const isUrl = sourceType !== 'raw_text';

  let rawInfo: string;

  if (isUrl) {
    // Step 1: compound fetches the URL content
    rawInfo = await fetchWithCompound(qrContent, sourceType);
  } else {
    // Raw text — no need for web search, pass directly
    rawInfo = qrContent;
  }

  // Step 2: structure into JSON
  const data = await structureAsJson(rawInfo, qrContent, sourceType);

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
