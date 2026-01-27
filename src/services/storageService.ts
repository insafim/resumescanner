import { supabase } from './supabaseClient';
import { Candidate, AnalysisResponse } from '../types';
import { DEFAULT_CANDIDATE_NAME } from '../constants';
import { deriveTempName } from '../utils/deriveTempName';
import { detectSourceType } from '../utils/detectSource';

// Source: https://supabase.com/docs/reference/javascript/select - Verified: 2026-01-27

export const getCandidates = async (): Promise<Candidate[]> => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('scanned_at', { ascending: false });

  if (error) {
    console.error('Failed to load candidates:', error.message);
    return [];
  }
  return data ?? [];
};

export const saveCandidate = async (candidate: Partial<Candidate> & { id?: string }): Promise<Candidate | null> => {
  if (candidate.id) {
    // Update existing candidate
    const { data, error } = await supabase
      .from('candidates')
      .update({ ...candidate, updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update candidate:', error.message);
      return null;
    }
    return data;
  } else {
    // Insert new candidate
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidate)
      .select()
      .single();

    if (error) {
      console.error('Failed to save candidate:', error.message);
      return null;
    }
    return data;
  }
};

export interface InsertScanResult {
  candidate: Candidate;
  isDuplicate: boolean;
}

// Insert a new scan — saves the QR link immediately before AI analysis
export const insertScan = async (qrContent: string): Promise<InsertScanResult | null> => {
  // Check for duplicate first
  const { data: existing } = await supabase
    .from('candidates')
    .select('*')
    .eq('qr_content', qrContent)
    .limit(1);

  if (existing && existing.length > 0) {
    return { candidate: existing[0] as Candidate, isDuplicate: true };
  }

  const tempName = deriveTempName(qrContent);
  const sourceType = detectSourceType(qrContent);

  // Assign next sequential candidate number
  const { data: maxRow } = await supabase
    .from('candidates')
    .select('candidate_number')
    .order('candidate_number', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = ((maxRow?.candidate_number as number | null) ?? 0) + 1;

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      qr_content: qrContent,
      scanned_at: new Date().toISOString(),
      status: 'pending',
      notes: '',
      analysis_status: 'processing',
      name: tempName,
      temp_name: tempName,
      source_type: sourceType,
      pipeline_step: 'name_derived',
      candidate_number: nextNumber,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert scan:', error.message);
    return null;
  }
  return { candidate: data as Candidate, isDuplicate: false };
};

// Update candidate with AI analysis results (stored as single JSONB column)
export const updateAnalysis = async (
  id: string,
  analysis: AnalysisResponse
): Promise<Candidate | null> => {
  const { data, error } = await supabase
    .from('candidates')
    .update({
      ai_analysis: analysis,
      name: analysis.name || DEFAULT_CANDIDATE_NAME,
      analysis_status: 'complete',
      pipeline_step: 'complete',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update analysis:', error.message);
    return null;
  }
  return data;
};

// Mark analysis as failed
export const markAnalysisFailed = async (id: string, errorMsg: string): Promise<void> => {
  await supabase
    .from('candidates')
    .update({
      analysis_status: 'failed',
      analysis_error: errorMsg,
      pipeline_step: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
};

// Persist URL resolution results (Phase 2: after Edge Function resolves redirects)
export const updateResolvedUrl = async (
  id: string,
  resolvedUrl: string
): Promise<void> => {
  await supabase
    .from('candidates')
    .update({
      resolved_url: resolvedUrl,
      pipeline_step: 'url_resolved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
};

// Update pipeline step independently (allows tracking progress without touching other fields)
export const updatePipelineStep = async (
  id: string,
  step: NonNullable<Candidate['pipeline_step']>
): Promise<void> => {
  await supabase
    .from('candidates')
    .update({
      pipeline_step: step,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
};

// Persist Google Drive web view link after the upload-to-drive Edge Function succeeds.
// Reuses the existing pdf_storage_path column (no DB migration needed).
export const updateDriveLink = async (
  id: string,
  webViewLink: string
): Promise<void> => {
  await supabase
    .from('candidates')
    .update({
      pdf_storage_path: webViewLink,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
};

export const deleteCandidate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete candidate:', error.message);
  }
};
