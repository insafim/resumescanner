import { supabase } from './supabaseClient';
import { Candidate, AnalysisResponse } from '../types';

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

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      qr_content: qrContent,
      scanned_at: new Date().toISOString(),
      status: 'pending',
      notes: '',
      analysis_status: 'processing',
      name: 'Unknown Candidate',
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
      name: analysis.name || 'Unknown Candidate',
      analysis_status: 'complete',
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
