import React, { useState, useEffect, useRef } from 'react';
import { Scan, Search, ThumbsUp, ThumbsDown, MessageSquare, ArrowLeft, Trash2, Check, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Candidate } from './types';
import Scanner from './components/Scanner';
import CandidateCard from './components/CandidateCard';
import { analyzeResumeContent } from './services/aiService';
import { getCandidates, saveCandidate, insertScan, updateAnalysis, markAnalysisFailed, deleteCandidate } from './services/storageService';

enum ViewState {
  DASHBOARD,
  SCANNER,
  REVIEW,
  EDIT
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Dashboard Filters
  const [filter, setFilter] = useState<'all' | 'go' | 'no-go' | 'pending'>('all');

  // Notes debounce timer
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    const data = await getCandidates();
    setCandidates(data);
  };

  // Run AI analysis in background and update the candidate when done
  const runAnalysis = async (candidate: Candidate) => {
    try {
      const analysis = await analyzeResumeContent(candidate.qr_content);
      const updated = await updateAnalysis(candidate.id, analysis);

      // If still viewing this candidate, refresh the UI
      setCurrentCandidate(prev => {
        if (prev && prev.id === candidate.id && updated) return updated;
        return prev;
      });

      await loadCandidates();
    } catch (error) {
      console.error('Analysis failed:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await markAnalysisFailed(candidate.id, msg);

      setCurrentCandidate(prev => {
        if (prev && prev.id === candidate.id) {
          return { ...prev, analysis_status: 'failed' as const, analysis_error: msg };
        }
        return prev;
      });

      await loadCandidates();
    }
  };

  const handleScan = async (qrData: string) => {
    setIsDuplicate(false);

    // 1. Save to Supabase immediately
    const result = await insertScan(qrData);

    if (!result) {
      alert('Failed to save scan. Please try again.');
      return;
    }

    const { candidate, isDuplicate: dup } = result;

    // 2. Flag duplicate
    if (dup) setIsDuplicate(true);

    // 3. Navigate to review page immediately
    setCurrentCandidate(candidate);
    setView(ViewState.REVIEW);

    // 4. Run AI analysis in background (only for new scans)
    if (!dup && candidate.analysis_status === 'processing') {
      runAnalysis(candidate);
    }
  };

  const handleRetryAnalysis = () => {
    if (!currentCandidate) return;
    setCurrentCandidate({ ...currentCandidate, analysis_status: 'processing', analysis_error: undefined });
    runAnalysis(currentCandidate);
  };

  const handleDecision = async (status: 'go' | 'no-go') => {
    if (!currentCandidate) return;
    const updated = { ...currentCandidate, status };
    await saveCandidate(updated);
    await loadCandidates();
    setView(ViewState.DASHBOARD);
  };

  const handleNotesChange = (notes: string) => {
    if (!currentCandidate) return;
    const candidateId = currentCandidate.id;
    setCurrentCandidate(prev => prev ? { ...prev, notes } : null);

    // Debounced auto-save (500ms)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      await saveCandidate({ id: candidateId, notes } as Candidate);
      await loadCandidates();
    }, 500);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this scan?')) {
      await deleteCandidate(id);
      await loadCandidates();
      if ((view === ViewState.EDIT || view === ViewState.REVIEW) && currentCandidate?.id === id) {
        setView(ViewState.DASHBOARD);
      }
    }
  };

  const openEdit = (candidate: Candidate) => {
    setCurrentCandidate(candidate);
    setIsDuplicate(false);
    setView(ViewState.EDIT);
  };

  const filteredCandidates = candidates.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  // Inline analysis status banner
  const AnalysisStatusBanner = () => {
    if (!currentCandidate) return null;

    if (currentCandidate.analysis_status === 'processing') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={20} className="text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">AI is analyzing this resume...</p>
            <p className="text-xs text-blue-600 mt-0.5">You can write notes while waiting.</p>
          </div>
        </div>
      );
    }

    if (currentCandidate.analysis_status === 'failed') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Analysis failed</p>
              <p className="text-xs text-red-600 mt-0.5">{currentCandidate.analysis_error || 'Unknown error'}</p>
            </div>
          </div>
          <button
            onClick={handleRetryAnalysis}
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto relative shadow-2xl overflow-hidden">

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        {view === ViewState.DASHBOARD ? (
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ResumeScanner</h1>
            <p className="text-xs text-slate-500 font-medium">HR Triage Tool</p>
          </div>
        ) : (
          <button
            onClick={() => { setView(ViewState.DASHBOARD); setIsDuplicate(false); }}
            className="flex items-center text-slate-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span className="font-medium">Back</span>
          </button>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="p-4">

        {/* DASHBOARD VIEW */}
        {view === ViewState.DASHBOARD && (
          <div className="space-y-6">
            {/* Action Card */}
            <div
              onClick={() => setView(ViewState.SCANNER)}
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
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  All ({candidates.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'pending' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  Pending ({candidates.filter(c => c.status === 'pending').length})
                </button>
                <button
                  onClick={() => setFilter('go')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === 'go' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  Go ({candidates.filter(c => c.status === 'go').length})
                </button>
                <button
                  onClick={() => setFilter('no-go')}
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
                      onClick={() => openEdit(candidate)}
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${candidate.status === 'go' ? 'bg-green-500' : candidate.status === 'no-go' ? 'bg-red-500' : 'bg-slate-300'}`}></div>

                      <div className="flex justify-between items-start pl-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 truncate">{candidate.name}</h3>
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
        )}

        {/* REVIEW OR EDIT VIEW */}
        {(view === ViewState.REVIEW || view === ViewState.EDIT) && currentCandidate && (
          <div className="space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-300">

            {/* Duplicate Warning */}
            {isDuplicate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                <p className="text-sm font-medium text-amber-800">This candidate was already scanned. Showing existing record.</p>
              </div>
            )}

            {/* Analysis Status Banner */}
            <AnalysisStatusBanner />

            {/* Name Header */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">{currentCandidate.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {new Date(currentCandidate.scanned_at).toLocaleDateString()}
                    </span>
                    {currentCandidate.ai_analysis?.sourceType && (
                      <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                        {currentCandidate.ai_analysis.sourceType}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(currentCandidate.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-full">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Structured Candidate Details */}
            <CandidateCard candidate={currentCandidate} />

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
                value={currentCandidate.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>

            {/* Spacer for bottom sticky bar */}
            <div className="h-24"></div>
          </div>
        )}

      </main>

      {/* STICKY ACTION BAR (Review Mode) */}
      {view === ViewState.REVIEW && currentCandidate && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex items-center gap-3 z-30 max-w-md mx-auto">
          <button
            onClick={() => handleDecision('no-go')}
            className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all"
          >
            <ThumbsDown size={20} />
            No-Go
          </button>
          <button
            onClick={() => handleDecision('go')}
            className="flex-1 py-4 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-95 transition-all"
          >
            <ThumbsUp size={20} />
            Go
          </button>
        </div>
      )}

      {/* STICKY ACTION BAR (Edit Mode) */}
      {view === ViewState.EDIT && currentCandidate && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex items-center gap-3 z-30 max-w-md mx-auto">
          <div className="flex-1 flex gap-2">
            <button
              onClick={async () => {
                const newStatus = currentCandidate.status === 'go' ? 'no-go' : 'go';
                const updated = { ...currentCandidate, status: newStatus as 'go' | 'no-go' };
                setCurrentCandidate(updated);
                await saveCandidate(updated);
                await loadCandidates();
              }}
              className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                currentCandidate.status === 'go'
                  ? 'bg-green-600 text-white shadow-green-200 shadow-lg'
                  : 'bg-red-600 text-white shadow-red-200 shadow-lg'
              }`}
            >
              {currentCandidate.status === 'go' ? <><Check size={18} /> Status: Go</> : <><X size={18} /> Status: No-Go</>}
            </button>
          </div>
        </div>
      )}

      {/* SCANNER OVERLAY */}
      {view === ViewState.SCANNER && (
        <Scanner onScan={handleScan} onClose={() => setView(ViewState.DASHBOARD)} />
      )}

    </div>
  );
};

export default App;
