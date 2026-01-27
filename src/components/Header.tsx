import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ViewState } from '../constants';

interface HeaderProps {
  view: ViewState;
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, onBack }) => {
  return (
    <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-20 max-w-md mx-auto px-4 py-5 flex items-center justify-between">
      {view === ViewState.DASHBOARD ? (
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">ResumeScanner</h1>
          <p className="text-xs text-slate-500 font-medium">HR Triage Tool</p>
        </div>
      ) : (
        <button
          onClick={onBack}
          className="flex items-center text-slate-600 hover:text-brand-600 transition-colors py-2 -my-2"
        >
          <ArrowLeft size={20} className="mr-1" />
          <span className="font-medium">Back</span>
        </button>
      )}
    </header>
  );
};

export default Header;
