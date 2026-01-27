/**
 * OpenAI-compatible JSON Schema for resume analysis structured output.
 * Mirrors the Gemini schema in aiSchema.ts but uses standard JSON Schema format
 * required by the OpenAI Responses API.
 *
 * Source: OpenAI Structured Outputs documentation
 * https://platform.openai.com/docs/guides/structured-outputs
 * Verified: 2026-01-28
 *
 * Note: With strict: true, ALL properties must be in `required` and every
 * object must have `additionalProperties: false`. The model outputs zero-values
 * (empty strings, empty arrays, 0) for fields it cannot find.
 */
export const openaiAnalysisSchema = {
  name: "analysis_response",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const },
      summary: { type: "string" as const },
      keyPoints: { type: "array" as const, items: { type: "string" as const } },
      urls: { type: "array" as const, items: { type: "string" as const } },
      educationLevel: { type: "string" as const },
      educationField: { type: "string" as const },
      educationUniversity: { type: "string" as const },
      educationDetails: { type: "string" as const },
      experienceSummary: { type: "string" as const },
      yearsOfExperience: { type: "integer" as const },
      previousRoles: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
            company: { type: "string" as const },
            duration: { type: "string" as const },
          },
          required: ["title", "company", "duration"],
          additionalProperties: false,
        },
      },
      technicalSkills: { type: "array" as const, items: { type: "string" as const } },
      projects: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            description: { type: "string" as const },
            url: { type: "string" as const },
          },
          required: ["name", "description", "url"],
          additionalProperties: false,
        },
      },
      overallAssessment: { type: "string" as const },
      sourceType: { type: "string" as const },
    },
    required: [
      "name", "summary", "keyPoints", "urls",
      "educationLevel", "educationField", "educationUniversity", "educationDetails",
      "experienceSummary", "yearsOfExperience", "previousRoles",
      "technicalSkills", "projects", "overallAssessment", "sourceType",
    ],
    additionalProperties: false,
  },
};
