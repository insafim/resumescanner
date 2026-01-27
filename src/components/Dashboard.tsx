import React from 'react';
import { Scan, Search, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { Candidate } from '../types';

type FilterType = 'all' | 'go' | 'no-go' | 'pending';

interface DashboardProps {
  candidates: Candidate[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onScanClick: () => void;
  onCandidateClick: (candidate: Candidate) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  candidates,
  filter,
  onFilterChange,
  onScanClick,
  onCandidateClick,
}) => {
  const filteredCandidates = candidates.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Action Card */}
      <div
        onClick={onScanClick}
        className="bg-brand-600 text-white rounded-2xl p-6 shadow-lg shadow-brand-200 active:scale-95 transition-transform cursor-pointer flex items-center justify-between group"
      >
        <div>
          <h2 className="text-2xl font-bold">Scan QR</h2>
          <p className="text-brand-100 text-sm mt-1">Auto-process resume content</p>
        </div>
        <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
          <Scan size={32} />
        </div>
      </div>

      {/* Stats/Filter */}
      <div>
        <div className="flex space-x-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            All ({candidates.length})
          </button>
          <button
            onClick={() => onFilterChange('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'pending' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pending ({candidates.filter(c => c.status === 'pending').length})
          </button>
          <button
            onClick={() => onFilterChange('go')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'go' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Go ({candidates.filter(c => c.status === 'go').length})
          </button>
          <button
            onClick={() => onFilterChange('no-go')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'no-go' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            No-Go ({candidates.filter(c => c.status === 'no-go').length})
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Search className="mx-auto mb-3 opacity-20" size={48} />
              <p>No candidates found.</p>
            </div>
          ) : (
            filteredCandidates.map(candidate => (
              <div
                key={candidate.id}
                onClick={() => onCandidateClick(candidate)}
                className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${candidate.status === 'go' ? 'bg-green-500' : candidate.status === 'no-go' ? 'bg-red-500' : 'bg-slate-300'}`}></div>

                <div className="flex justify-between items-start pl-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {candidate.candidate_number != null && (
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded shrink-0">
                          #{String(candidate.candidate_number).padStart(3, '0')}
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 truncate">{candidate.ai_analysis?.name || candidate.temp_name || candidate.name}</h3>
                      {candidate.analysis_status === 'processing' && (
                        <Loader2 size={14} className="text-blue-500 animate-spin shrink-0" />
                      )}
                      {candidate.analysis_status === 'failed' && (
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{candidate.ai_analysis?.summary || candidate.qr_content}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide shrink-0 ml-2 ${
                    candidate.status === 'go' ? 'bg-green-100 text-green-700' :
                    candidate.status === 'no-go' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {candidate.status}
                  </span>
                </div>

                {candidate.notes && (
                  <div className="flex items-start gap-2 mt-2 pl-2 bg-slate-50 p-2 rounded text-xs text-slate-600">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{candidate.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
