# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-01

### Added
- OpenAI as a third AI provider alongside Gemini and Groq
- Google Drive PDF archival via OAuth refresh-token (`upload-to-drive` Edge Function)
- Symplicity career-services source type with redirect resolution (`resolve-url` Edge Function)
- Native PDF ingestion for resolved URLs via Gemini `createPartFromUri` and OpenAI `file_url`

### Changed
- Drive uploads now use OAuth refresh tokens instead of a service account
- Drive PDF filename is derived from the candidate number for stable de-duplication
- App decomposed into modular components and hooks (`useCandidates`, `useNotesAutoSave`)
- Services restructured with retry / timeout wrappers and URL resolution
- UI: native body scroll on mobile, fixed header positioning, tightened header / action-bar padding
- Candidate names anonymized in list and review views

### Fixed
- Skip Drive upload when the PDF is already stored
- `resolve-url` Edge Function handles locked `ReadableStream` correctly
- OpenAI client lazy-initialized to prevent crash when the API key is absent

### Security
- Added OAuth client-secret JSON pattern to `.gitignore`

[Unreleased]: https://github.com/insafim/resumescanner/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/insafim/resumescanner/releases/tag/v0.1.0
