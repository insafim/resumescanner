import { Type } from "@google/genai";

/**
 * Shared Gemini API response schema for resume analysis.
 * Used by both URL-based and Google Drive PDF analysis.
 *
 * Source: @google/genai schema types
 * https://ai.google.dev/api/generate-content#method:-models.generatecontent
 */
export const analysisResponseSchema = {
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
};
