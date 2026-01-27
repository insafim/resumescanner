import { useState, useEffect, useCallback } from 'react';
import { Candidate } from '../types';
import { analyzeResumeContent, type ResolvedPdfContext } from '../services/aiService';
import { resolveUrl } from '../services/resolveUrlService';
import { uploadPdfToDrive } from '../services/driveUploadService';
import {
  getCandidates,
  saveCandidate,
  insertScan,
  updateAnalysis,
  markAnalysisFailed,
  updatePipelineStep,
  updateResolvedUrl,
  updateDriveLink,
  deleteCandidate,
} from '../services/storageService';

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const loadCandidates = useCallback(async () => {
    const data = await getCandidates();
    setCandidates(data);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Resume any analyses that were interrupted (e.g., by page refresh)
  useEffect(() => {
    if (candidates.length === 0) return;

    const stuck = candidates.filter(c => c.analysis_status === 'processing');
    if (stuck.length === 0) return;

    console.info(`[useCandidates] Resuming ${stuck.length} interrupted analysis(es)`);
    for (const candidate of stuck) {
      runAnalysis(candidate, () => {
        loadCandidates();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length > 0]);

  const handleSave = useCallback(async (candidate: Partial<Candidate> & { id?: string }) => {
    await saveCandidate(candidate);
    await loadCandidates();
  }, [loadCandidates]);

  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    if (!confirm('Are you sure you want to delete this scan?')) return false;
    await deleteCandidate(id);
    await loadCandidates();
    return true;
  }, [loadCandidates]);

  const handleInsertScan = useCallback(async (qrData: string) => {
    return await insertScan(qrData);
  }, []);

  const runAnalysis = useCallback(async (
    candidate: Candidate,
    onUpdate: (updated: Candidate | null) => void
  ) => {
    try {
      // Step 1: Resolve URL redirects (non-blocking — falls back to original URL on failure)
      let contentUrl = candidate.qr_content;
      let resolvedPdfContext: ResolvedPdfContext | undefined;
      if (candidate.qr_content.startsWith('http')) {
        try {
          await updatePipelineStep(candidate.id, 'url_saved');
          const resolved = await resolveUrl(candidate.qr_content);
          console.info('[useCandidates] Resolve result:', resolved);
          if (resolved && resolved.finalUrl && !resolved.error) {
            contentUrl = resolved.finalUrl;
            await updateResolvedUrl(candidate.id, resolved.finalUrl);
            onUpdate({ ...candidate, resolved_url: resolved.finalUrl, pipeline_step: 'url_resolved' });

            // If the resolved URL is a PDF, Gemini will fetch it directly via createPartFromUri
            if (resolved.isPdf) {
              resolvedPdfContext = {
                resolvedPdfUrl: resolved.finalUrl,
                originalUrl: candidate.qr_content,
              };
              console.info('[useCandidates] Resolved to PDF URL, will use createPartFromUri');

              // Fire-and-forget Google Drive upload — runs in parallel with AI analysis.
              // Intentionally NOT awaited so it never blocks the analysis pipeline.
              // Skip if already uploaded (prevents duplicates on analysis retry).
              if (!candidate.pdf_storage_path) {
                uploadPdfToDrive(resolved.finalUrl, candidate.name || candidate.temp_name || 'Unknown', candidate.id, candidate.candidate_number ?? 0)
                  .then(async (result) => {
                    if (result?.webViewLink) {
                      console.info('[useCandidates] Drive upload complete:', result.webViewLink);
                      await updateDriveLink(candidate.id, result.webViewLink);
                      loadCandidates();
                    }
                  })
                  .catch((err) => {
                    console.warn('[useCandidates] Drive upload failed (non-blocking):', err);
                  });
              }
            }
          } else {
            console.warn('[useCandidates] URL resolution returned no usable result, using original URL');
          }
        } catch (resolveErr) {
          // Non-fatal: log and continue with original URL
          console.warn('[useCandidates] URL resolution failed, using original URL:', resolveErr);
        }
      }

      // Step 2: Run AI analysis
      // Priority: resolved PDF URL → URL-based analysis with googleSearch
      await updatePipelineStep(candidate.id, 'analysis_running');
      const analysis = await analyzeResumeContent(contentUrl, undefined, resolvedPdfContext);
      const updated = await updateAnalysis(candidate.id, analysis);
      onUpdate(updated);
      await loadCandidates();
    } catch (error) {
      console.error('Analysis failed:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await markAnalysisFailed(candidate.id, msg);
      onUpdate({ ...candidate, analysis_status: 'failed' as const, analysis_error: msg, pipeline_step: 'failed' as const });
      await loadCandidates();
    }
  }, [loadCandidates]);

  return {
    candidates,
    loadCandidates,
    handleSave,
    handleDelete,
    handleInsertScan,
    runAnalysis,
  };
}
