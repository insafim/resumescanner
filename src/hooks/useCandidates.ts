import { useState, useEffect, useCallback } from 'react';
import { Candidate } from '../types';
import { analyzeResumeContent, type PdfContext } from '../services/aiService';
import { resolveUrl } from '../services/resolveUrlService';
import { downloadStoredPdf } from '../utils/downloadStoredPdf';
import {
  getCandidates,
  saveCandidate,
  insertScan,
  updateAnalysis,
  markAnalysisFailed,
  updatePipelineStep,
  updateResolvedUrl,
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
      let storagePath: string | undefined;
      if (candidate.qr_content.startsWith('http')) {
        try {
          await updatePipelineStep(candidate.id, 'url_saved');
          const resolved = await resolveUrl(candidate.qr_content, candidate.id);
          if (resolved && resolved.finalUrl && !resolved.error) {
            contentUrl = resolved.finalUrl;
            storagePath = resolved.storagePath ?? undefined;
            await updateResolvedUrl(candidate.id, resolved.finalUrl, resolved.storagePath);
            onUpdate({ ...candidate, resolved_url: resolved.finalUrl, pdf_storage_path: storagePath, pipeline_step: 'url_resolved' });
          }
        } catch (resolveErr) {
          // Non-fatal: log and continue with original URL
          console.warn('[useCandidates] URL resolution failed, using original URL:', resolveErr);
        }
      }

      // Step 2: If a stored PDF exists, download it for direct AI analysis
      let pdfContext: PdfContext | undefined;
      if (storagePath) {
        try {
          const pdfResult = await downloadStoredPdf(storagePath);
          if (pdfResult) {
            pdfContext = { pdfBase64: pdfResult.base64, originalUrl: candidate.qr_content };
          }
        } catch (downloadErr) {
          // Non-fatal: fall back to URL-based analysis
          console.warn('[useCandidates] PDF download from storage failed, falling back to URL:', downloadErr);
        }
      }

      // Step 3: Run AI analysis (using stored PDF if available, otherwise URL)
      await updatePipelineStep(candidate.id, 'analysis_running');
      const analysis = await analyzeResumeContent(contentUrl, pdfContext);
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
