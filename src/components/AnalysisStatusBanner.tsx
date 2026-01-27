import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Candidate } from '../types';

interface AnalysisStatusBannerProps {
  candidate: Candidate;
  onRetry: () => void;
}

const AnalysisStatusBanner: React.FC<AnalysisStatusBannerProps> = ({ candidate, onRetry }) => {
  if (candidate.analysis_status === 'processing') {
    const step = candidate.pipeline_step;
    let stepLabel = 'Processing scan...';
    if (step === 'url_saved') stepLabel = 'Resolving URL...';
    else if (step === 'url_resolved') stepLabel = 'URL resolved. Starting analysis...';
    else if (step === 'analysis_running') stepLabel = 'Running AI analysis...';
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={20} className="text-blue-600 animate-spin shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">{stepLabel}</p>
          <p className="text-xs text-blue-600 mt-0.5">You can write notes while waiting.</p>
        </div>
      </div>
    );
  }

  if (candidate.analysis_status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Analysis failed</p>
            <p className="text-xs text-red-600 mt-0.5">{candidate.analysis_error || 'Unknown error'}</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-sm font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors shrink-0"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return null;
};

export default AnalysisStatusBanner;
