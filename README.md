<div align="center">
  <h1>ResumeScanner Pro</h1>
  <p><strong>AI-powered resume triage for university career fair recruiters</strong></p>
  <p>
    <img alt="React 19" src="https://img.shields.io/badge/React-19-blue?logo=react" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-6-purple?logo=vite" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-green?logo=supabase" />
  </p>
</div>

---

## What It Does

ResumeScanner Pro lets recruiters at university career fairs:

1. **Scan** a candidate's QR code (resume URL, GitHub, LinkedIn, portfolio, or raw text)
2. **Auto-analyze** the content using AI (Google Gemini or Groq) to extract structured candidate data
3. **Triage** candidates with Go / No-Go decisions and recruiter notes
4. **Review** a filterable dashboard of all scanned candidates

## Features

- **QR Code Scanning** -- Real-time camera-based scanning with visual feedback and haptic response
- **Dual AI Providers** -- Google Gemini (with Google Search grounding) or Groq (compound search + LLaMA structuring)
- **Smart Source Detection** -- Automatically detects GitHub, LinkedIn, Google Drive PDFs, portfolios, and raw text
- **Google Drive PDF Support** -- Gemini reads Drive PDFs natively via `createPartFromUri`
- **Duplicate Detection** -- Prevents re-processing already-scanned candidates
- **Background Analysis** -- AI processing runs asynchronously; recruiters can take notes while waiting
- **Auto-Saving Notes** -- Debounced auto-save for recruiter notes (500ms)
- **Structured Data Extraction** -- Education, experience, skills, projects, and an AI assessment
- **Mobile-First Design** -- Built for phone use at career fairs with sticky action bars and touch-optimized UI
- **Retry on Failure** -- Analysis errors show a retry button for quick re-attempts
- **Supabase Backend** -- Real-time data persistence with row-level security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| QR Scanning | jsQR |
| AI (Option A) | Google Gemini (`gemini-3-flash-preview`) via `@google/genai` |
| AI (Option B) | Groq (`groq/compound` + `llama-3.3-70b-versatile`) via `groq-sdk` |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Deployment | Vercel |

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project with a `candidates` table (schema below)
- At least one AI provider API key:
  - [Google Gemini API Key](https://aistudio.google.com/apikey)
  - [Groq API Key](https://console.groq.com/keys)

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd resumescanner
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys. See [Environment Variables](#environment-variables) below.

### 4. Set up Supabase

Create a `candidates` table in your Supabase project:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `qr_content` | `text` | | The raw QR code content |
| `scanned_at` | `timestamptz` | `now()` | When the scan occurred |
| `created_at` | `timestamptz` | `now()` | Row creation time |
| `updated_at` | `timestamptz` | | Last update time |
| `status` | `text` | `'pending'` | `pending`, `go`, or `no-go` |
| `notes` | `text` | `''` | Recruiter notes |
| `analysis_status` | `text` | `'pending'` | `pending`, `processing`, `complete`, `failed` |
| `analysis_error` | `text` | | Error message if analysis failed |
| `name` | `text` | `'Unknown Candidate'` | Candidate name (populated by AI) |
| `ai_analysis` | `jsonb` | | Structured AI analysis result |

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

> **Note:** Camera access requires HTTPS in production. Local development on `localhost` works without HTTPS.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | No | `"gemini"` (default) or `"groq"` |
| `GEMINI_API_KEY` | If using Gemini | Google Gemini API key |
| `GROQ_API_KEY` | If using Groq | Groq API key |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key |

## Project Structure

```
src/
├── components/                   # React UI components
│   ├── Scanner.tsx               # Camera-based QR code scanner
│   ├── CandidateCard.tsx         # AI analysis results display
│   ├── Dashboard.tsx             # Main dashboard with filters and candidate list
│   ├── CandidateReview.tsx       # Candidate detail view (review + edit)
│   ├── Header.tsx                # App header with navigation
│   ├── ActionBar.tsx             # Sticky bottom action bar (Go/No-Go)
│   └── AnalysisStatusBanner.tsx  # Processing/error status indicator
├── hooks/                        # Custom React hooks
│   ├── useCandidates.ts          # Candidate CRUD operations and state
│   └── useNotesAutoSave.ts       # Debounced auto-save for notes
├── services/                     # External service integrations
│   ├── aiService.ts              # AI provider router (Gemini vs Groq) with retry
│   ├── geminiService.ts          # Google Gemini integration
│   ├── groqService.ts            # Groq integration (compound + LLaMA)
│   ├── storageService.ts         # Supabase CRUD operations
│   └── supabaseClient.ts         # Supabase client initialization
├── types/                        # TypeScript interfaces
│   └── index.ts                  # Candidate, AnalysisResponse types
├── constants/                    # Application constants and enums
│   ├── index.ts                  # ViewState, timeouts, default values
│   └── aiSchema.ts               # Shared AI response schema (Gemini)
├── utils/                        # Shared utility functions
│   └── detectSource.ts           # Source type detection for QR content
├── App.tsx                       # Root component (view routing + state coordination)
└── main.tsx                      # React entry point
```

## Architecture

```
[QR Code] --> Scanner.tsx --> App.tsx --> storageService.insertScan()
                                     --> aiService.analyzeResumeContent()
                                         ├── geminiService (Gemini + Google Search)
                                         └── groqService (Compound + LLaMA)
                                     --> storageService.updateAnalysis()
                                     --> CandidateReview.tsx (display results)

[Dashboard] --> App.tsx --> storageService.getCandidates() --> Dashboard.tsx
```

**Key design decisions:**

- AI analysis runs asynchronously after the scan is saved, so recruiters are never blocked
- Google Drive PDFs always route to Gemini (can read PDFs natively via `createPartFromUri`)
- The Supabase anon key is safe in the browser -- Row Level Security policies control data access
- All AI calls are wrapped with exponential backoff retry (3 attempts) for transient errors
- Environment variables are injected at build time via Vite's `define` config

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

## Deployment (Vercel)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings (same as `.env.local`)
4. Deploy -- Vercel auto-detects Vite and builds automatically

## License

MIT
