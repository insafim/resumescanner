import React from 'react';
import { ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';
import { ViewState } from '../constants';
import { Candidate } from '../types';

interface ActionBarProps {
  view: ViewState;
  candidate: Candidate;
  onDecision: (status: 'go' | 'no-go') => void;
  onToggleStatus: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ view, candidate, onDecision, onToggleStatus }) => {
  if (view === ViewState.REVIEW) {
    return (
      <div className="fixed bottom-0 left-0 right-0 px-4 py-5 bg-white border-t border-slate-200 flex items-center gap-3 z-30 max-w-md mx-auto">
        <button
          onClick={() => onDecision('no-go')}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all"
        >
          <ThumbsDown size={20} />
          No-Go
        </button>
        <button
          onClick={() => onDecision('go')}
          className="flex-1 py-4 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all"
        >
          <ThumbsUp size={20} />
          Go
        </button>
      </div>
    );
  }

  if (view === ViewState.EDIT) {
    return (
      <div className="fixed bottom-0 left-0 right-0 px-4 py-5 bg-white border-t border-slate-200 flex items-center gap-3 z-30 max-w-md mx-auto">
        <div className="flex-1 flex gap-2">
          <button
            onClick={onToggleStatus}
            className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              candidate.status === 'go'
                ? 'bg-green-600 text-white shadow-green-200 shadow-lg'
                : 'bg-red-600 text-white shadow-red-200 shadow-lg'
            }`}
          >
            {candidate.status === 'go' ? <><Check size={18} /> Status: Go</> : <><X size={18} /> Status: No-Go</>}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ActionBar;
