import React from 'react';
import { Trash2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Candidate } from '../types';
import CandidateCard from './CandidateCard';
import AnalysisStatusBanner from './AnalysisStatusBanner';

interface CandidateReviewProps {
  candidate: Candidate;
  isDuplicate: boolean;
  onRetryAnalysis: () => void;
  onDelete: (id: string) => void;
  onNotesChange: (notes: string) => void;
  onSave: (updates: Partial<Candidate>) => void;
}

const formatCandidateNumber = (n?: number) =>
  n != null ? `#${String(n).padStart(3, '0')}` : null;

const CandidateReview: React.FC<CandidateReviewProps> = ({
  candidate,
  isDuplicate,
  onRetryAnalysis,
  onDelete,
  onNotesChange,
  onSave,
}) => {
  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-300">

      {/* Duplicate Warning */}
      {isDuplicate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">This candidate was already scanned. Showing existing record.</p>
        </div>
      )}

      {/* Analysis Status Banner */}
      <AnalysisStatusBanner candidate={candidate} onRetry={onRetryAnalysis} />

      {/* Name Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              {formatCandidateNumber(candidate.candidate_number) && (
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                  {formatCandidateNumber(candidate.candidate_number)}
                </span>
              )}
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">{candidate.ai_analysis?.name || candidate.temp_name || candidate.name}</h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                {new Date(candidate.scanned_at).toLocaleDateString()}
              </span>
              {(candidate.ai_analysis?.sourceType || candidate.source_type) && (
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  {candidate.ai_analysis?.sourceType || candidate.source_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => onDelete(candidate.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-full">
            <Trash2 size={20} />
          </button>
        </div>

        {/* Recruiter-set fields */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Degree</label>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              value={candidate.degree_type || ''}
              onChange={(e) => onSave({ degree_type: (e.target.value || undefined) as Candidate['degree_type'] })}
            >
              <option value="">Not set</option>
              <option value="bachelors">Bachelors</option>
              <option value="masters">Masters</option>
              <option value="phd">PhD</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Role Type</label>
            <select
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              value={candidate.job_type || ''}
              onChange={(e) => onSave({ job_type: (e.target.value || undefined) as Candidate['job_type'] })}
            >
              <option value="">Not set</option>
              <option value="internship">Internship</option>
              <option value="full_time">Full-time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Candidate Details */}
      <CandidateCard candidate={candidate} />

      {/* Notes Input */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
          <MessageSquare size={16} />
          Recruiter Notes
        </label>
        <textarea
          className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none bg-slate-50"
          rows={3}
          placeholder="Add thoughts about this candidate..."
          value={candidate.notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {/* Spacer for bottom sticky bar */}
      <div className="h-24"></div>
    </div>
  );
};

export default CandidateReview;
