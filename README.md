<div align="center">
  <h1>📇 ResumeScanner Pro</h1>
  <p><strong>AI-powered resume triage for university career fair recruiters</strong></p>
  <p>
    <a href="https://github.com/insafxads/resumescanner"><img alt="Status: Alpha" src="https://img.shields.io/badge/status-alpha-orange.svg" /></a>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
    <a href="https://react.dev"><img alt="React 19" src="https://img.shields.io/badge/React-19-blue?logo=react" /></a>
    <a href="https://www.typescriptlang.org"><img alt="TypeScript 5.8" src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" /></a>
    <a href="https://vitejs.dev"><img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-purple?logo=vite" /></a>
    <a href="https://supabase.com"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-green?logo=supabase" /></a>
  </p>
</div>

---

## 🎯 What It Does

ResumeScanner Pro lets recruiters at university career fairs:

1. **Scan** a candidate's QR code (resume URL, GitHub, LinkedIn, portfolio, Symplicity link, Google Drive PDF, or raw text)
2. **Auto-analyze** the content with AI (Google Gemini, Groq, or OpenAI) to extract structured candidate data
3. **Triage** candidates with Go / No-Go decisions and recruiter notes
4. **Review** a filterable dashboard of all scanned candidates

Built for phone use at the booth — mobile-first, sticky action bars, background AI so the recruiter is never blocked.

## ✨ Features

### Capture

- **QR Code Scanning** — Real-time camera-based scanning via `jsQR` with visual feedback and haptic response
- **Smart Source Detection** — Automatically detects GitHub, LinkedIn, Google Drive PDFs, Symplicity career-services links, generic portfolios, and raw text
- **Symplicity Resolution** — A Supabase Edge Function follows redirects (HTTP 3xx, meta-refresh, JS) to the underlying resume PDF
- **Google Drive Archival** — Resolved PDFs are uploaded to a configured Drive folder via OAuth refresh-token (idempotent — skips re-upload if already stored)

### AI Analysis

- **Triple Provider Support** — Choose Google Gemini, Groq, or OpenAI via the `AI_PROVIDER` env var
- **Native PDF Reading** — Gemini and OpenAI ingest PDFs directly (`createPartFromUri` / `file_url`); Groq falls back to URL-based analysis
- **Retry on Transient Errors** — All AI calls wrapped with exponential backoff (3 attempts, 30 s timeout) for 503/429/network failures
- **Structured Extraction** — Education, experience, skills, projects, plus a recruiter-facing assessment

### Workflow

- **Background Analysis** — AI runs asynchronously; recruiters can take notes while waiting
- **Auto-Saving Notes** — Debounced auto-save (500 ms) for recruiter notes
- **Duplicate Detection** — Prevents re-processing already-scanned candidates
- **Retry on Failure** — Analysis errors expose a retry button

### Storage

- **Supabase Backend** — PostgreSQL with Row Level Security; the browser-safe anon key controls access
- **Edge Functions** — `resolve-url` (redirect resolution) and `upload-to-drive` (Drive archival) run server-side on Supabase

## 🏗️ Architecture

```
                        ┌──────────────────┐
                        │  Phone Camera    │
                        └────────┬─────────┘
                                 │ video stream
                                 ▼
                        ┌──────────────────┐
                        │ Scanner.tsx +    │
                        │   jsQR (CDN)     │
                        └────────┬─────────┘
                                 │ QR content
                                 ▼
              ┌───────────────────────────────────┐
              │ App.tsx (view + state coordinator)│
              └───┬─────────────┬─────────────────┘
                  │             │
                  ▼             ▼
         storageService   aiService.analyzeResumeContent()
            (Supabase)         │
              │                ├── geminiService  (Gemini + Google Search)
              │                ├── groqService    (compound + LLaMA)
              │                └── openaiService  (gpt models, file_url)
              │                       │
              │                       │  PDF URLs?
              │                       ▼
              │            ┌─────────────────────────────┐
              │            │ Supabase Edge Functions     │
              │            │  • resolve-url   (redirects)│
              │            │  • upload-to-drive  (OAuth) │
              │            └─────────────────────────────┘
              │
              ▼
    PostgreSQL (RLS)  ──►  Dashboard.tsx / CandidateReview.tsx
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [React 19](https://react.dev), [TypeScript 5.8](https://www.typescriptlang.org) |
| Build | [Vite 6](https://vitejs.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) (via CDN, see [`index.html`](index.html)) |
| Icons | [`lucide-react`](https://lucide.dev) |
| QR Scanning | [`jsQR`](https://github.com/cozmo/jsQR) 1.4.0 (via CDN) |
| AI — Gemini | [`@google/genai`](https://www.npmjs.com/package/@google/genai), `gemini-3-flash-preview` |
| AI — Groq | [`groq-sdk`](https://www.npmjs.com/package/groq-sdk), `groq/compound` + `llama-3.3-70b-versatile` |
| AI — OpenAI | [`openai`](https://www.npmjs.com/package/openai) v6 |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security) |
| Edge Functions | Supabase Edge Runtime (Deno) |
| Deployment | [Vercel](https://vercel.com) |

### Key Design Decisions

- **Async analysis after save** — The scan is persisted before AI runs, so recruiters are never blocked by model latency
- **PDF routing** — Drive / resolved-PDF inputs always route to Gemini or OpenAI (Groq cannot ingest PDFs)
- **Anon key in the browser is safe** — Row Level Security policies, not key secrecy, control data access
- **Retry on transient errors** — Exponential backoff with jitter handles 503/429/network blips without user intervention
- **OAuth refresh token for Drive** — Personal Drive uploads use a stored refresh token (no service account, no domain-wide delegation)
- **Build-time env injection** — Vite's `define` config injects API keys at build time (see [`vite.config.ts`](vite.config.ts))

## 📋 Prerequisites

- **Node.js** 18+
- **npm** (ships with Node)
- A [Supabase](https://supabase.com) project with a `candidates` table (schema in Quick Start step 4)
- At least one AI provider API key:
  - [Google Gemini API Key](https://aistudio.google.com/apikey), **or**
  - [Groq API Key](https://console.groq.com/keys), **or**
  - [OpenAI API Key](https://platform.openai.com/api-keys)
- *(Optional, for Symplicity / Drive features)* [Supabase CLI](https://supabase.com/docs/guides/cli) to deploy Edge Functions

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/insafxads/resumescanner.git
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

Edit `.env.local` with your actual API keys. See [Configuration](#-configuration) below.

### 4. Set up the Supabase `candidates` table

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

Add appropriate Row Level Security policies for your auth setup.

### 5. Run the development server

```bash
npm run dev
```

**Done!** Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

> **Note:** Camera access requires HTTPS in production. Local development on `localhost` works without HTTPS.

## ⚙️ Configuration

### Environment Variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in the values that match the providers you intend to use.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | No | `gemini` | One of `gemini`, `groq`, `openai` |
| `GEMINI_API_KEY` | Conditional | — | Required if `AI_PROVIDER=gemini` |
| `GROQ_API_KEY` | Conditional | — | Required if `AI_PROVIDER=groq` |
| `OPENAI_API_KEY` | Conditional | — | Required if `AI_PROVIDER=openai` |
| `SUPABASE_URL` | Yes | — | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anon/public key (browser-safe with RLS) |

### Edge Function Secrets *(only if using Symplicity resolution or Drive upload)*

These are set on the Supabase project, not in `.env.local`. Use `supabase secrets set KEY=value`:

| Secret | Used by | Purpose |
|--------|---------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | `upload-to-drive` | OAuth 2.0 client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `upload-to-drive` | OAuth 2.0 client secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | `upload-to-drive` | Long-lived refresh token for the Drive account |
| `GOOGLE_DRIVE_FOLDER_ID` | `upload-to-drive` | Destination folder in Drive |

## 📁 Project Structure

```
resumescanner/
├── src/                              # React app source
│   ├── components/                   # UI components
│   │   ├── Scanner.tsx               # Camera-based QR code scanner
│   │   ├── CandidateCard.tsx         # AI analysis results display
│   │   ├── Dashboard.tsx             # Main dashboard with filters and candidate list
│   │   ├── CandidateReview.tsx       # Candidate detail view (review + edit)
│   │   ├── Header.tsx                # App header with navigation
│   │   ├── ActionBar.tsx             # Sticky bottom action bar (Go/No-Go)
│   │   └── AnalysisStatusBanner.tsx  # Processing/error status indicator
│   ├── hooks/                        # Custom React hooks
│   │   ├── useCandidates.ts          # Candidate CRUD operations and state
│   │   └── useNotesAutoSave.ts       # Debounced auto-save for notes
│   ├── services/                     # External service integrations
│   │   ├── aiService.ts              # Provider router (Gemini / Groq / OpenAI) with retry
│   │   ├── geminiService.ts          # Google Gemini integration
│   │   ├── groqService.ts            # Groq integration (compound + LLaMA)
│   │   ├── openaiService.ts          # OpenAI integration
│   │   ├── storageService.ts         # Supabase CRUD operations
│   │   └── supabaseClient.ts         # Supabase client initialization
│   ├── types/                        # TypeScript interfaces
│   ├── constants/                    # ViewState, timeouts, AI schema
│   ├── utils/                        # Source detection, helpers
│   ├── App.tsx                       # Root component (view routing + state coordination)
│   └── main.tsx                      # React entry point
├── supabase/
│   └── functions/                    # Supabase Edge Functions (Deno)
│       ├── resolve-url/              # Resolves redirect chains to a final PDF URL
│       ├── upload-to-drive/          # Uploads resolved PDFs to a Drive folder
│       └── _shared/                  # Shared CORS helpers
├── index.html                        # Vite entry; loads Tailwind + jsQR via CDN
├── vite.config.ts                    # Vite config (port 3000, env injection)
├── vercel.json                       # Vercel deployment config
└── package.json
```

## 🛠️ Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |

### Adding a New AI Provider

1. Create `src/services/<provider>Service.ts` exporting `analyzeResumeContent`, `analyzeGoogleDrivePdf`, `analyzeStoredPdf`, `analyzeResolvedPdf`
2. Add the new branch in [`src/services/aiService.ts`](src/services/aiService.ts) under each PDF-routing block
3. Add the API key to `.env.example` and the [Configuration](#-configuration) table
4. Inject the env var in [`vite.config.ts`](vite.config.ts) under `define`

### Adding a New Source Type

1. Add detection in [`src/utils/detectSource.ts`](src/utils/detectSource.ts)
2. Add a corresponding entry in `sourceHints` so the AI prompt gets context
3. If the source needs URL resolution (e.g. another redirect-heavy provider), extend the `resolve-url` Edge Function

## 🚢 Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add the [Environment Variables](#-configuration) in the Vercel project settings
4. Deploy — Vercel auto-detects Vite and builds automatically

### Edge Functions (Supabase)

```bash
# Link your local repo to the Supabase project
supabase link --project-ref <your-project-ref>

# Set Edge Function secrets (Drive OAuth set, only if using upload-to-drive)
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=...
supabase secrets set GOOGLE_OAUTH_CLIENT_SECRET=...
supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN=...
supabase secrets set GOOGLE_DRIVE_FOLDER_ID=...

# Deploy the functions
supabase functions deploy resolve-url
supabase functions deploy upload-to-drive
```

## 🔒 Security

- **Anon key in the browser is intended** — Supabase Row Level Security controls data access. Never ship a service-role key to the client.
- **Drive OAuth uses a refresh token, not a service account** — credentials live as Edge Function secrets on the server, never in the browser bundle.
- **Edge Functions enforce CORS** — see [`supabase/functions/_shared/cors.ts`](supabase/functions/_shared/cors.ts).
- **`.gitignore` excludes OAuth client secret JSONs** — the `client_secret_*.json` pattern is reserved for local-only files.
- **No PII in error logs** — analysis errors surfaced to the UI are sanitized; raw provider errors stay in the console.

To report a vulnerability, please open a private security advisory at [github.com/insafxads/resumescanner/security/advisories/new](https://github.com/insafxads/resumescanner/security/advisories/new).

## 🏷️ Releases

Current development version: `v0.1.0` (alpha, untagged). Once the first version is cut, tagged builds will appear on the [**Releases page**](https://github.com/insafxads/resumescanner/releases). The running list of changes lives in [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`.

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ by <a href="https://insafismath.com">Insaf Ismath</a>
</div>

<div align="center">
  <sub>Version: 0.1.0 · Last updated: 2026-04-30</sub>
</div>
