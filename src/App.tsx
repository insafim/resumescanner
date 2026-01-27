import React, { useState } from 'react';
import { Candidate } from './types';
import { ViewState } from './constants';
import { useCandidates } from './hooks/useCandidates';
import { useNotesAutoSave } from './hooks/useNotesAutoSave';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CandidateReview from './components/CandidateReview';
import ActionBar from './components/ActionBar';
import Scanner from './components/Scanner';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'go' | 'no-go' | 'pending'>('all');

  const { candidates, handleSave, handleDelete, handleInsertScan, runAnalysis } = useCandidates();
  const { saveNotes } = useNotesAutoSave({ onSave: handleSave });

  const handleScan = async (qrData: string) => {
    setIsDuplicate(false);
    const result = await handleInsertScan(qrData);

    if (!result) {
      alert('Failed to save scan. Please try again.');
      return;
    }

    const { candidate, isDuplicate: dup } = result;
    if (dup) setIsDuplicate(true);

    setCurrentCandidate(candidate);
    setView(ViewState.REVIEW);

    if (!dup && candidate.analysis_status === 'processing') {
      runAnalysis(candidate, (updated) => {
        setCurrentCandidate(prev => {
          if (prev && prev.id === candidate.id && updated) return updated;
          return prev;
        });
      });
    }
  };

  const handleRetryAnalysis = () => {
    if (!currentCandidate) return;
    setCurrentCandidate({ ...currentCandidate, analysis_status: 'processing', analysis_error: undefined });
    runAnalysis(currentCandidate, (updated) => {
      setCurrentCandidate(prev => {
        if (prev && prev.id === currentCandidate.id && updated) return updated;
        return prev;
      });
    });
  };

  const handleDecision = async (status: 'go' | 'no-go') => {
    if (!currentCandidate) return;
    await handleSave({ ...currentCandidate, status });
    setView(ViewState.DASHBOARD);
  };

  const handleNotesChange = (notes: string) => {
    if (!currentCandidate) return;
    setCurrentCandidate(prev => prev ? { ...prev, notes } : null);
    saveNotes(currentCandidate.id, notes);
  };

  const handleFieldSave = async (updates: Partial<Candidate>) => {
    if (!currentCandidate) return;
    setCurrentCandidate(prev => prev ? { ...prev, ...updates } : null);
    // Convert undefined values to null so Supabase clears the DB column
    const dbPayload: Record<string, unknown> = { id: currentCandidate.id };
    for (const [key, value] of Object.entries(updates)) {
      dbPayload[key] = value ?? null;
    }
    await handleSave(dbPayload as Partial<Candidate> & { id: string });
  };

  const handleDeleteCandidate = async (id: string) => {
    const deleted = await handleDelete(id);
    if (deleted && (view === ViewState.EDIT || view === ViewState.REVIEW) && currentCandidate?.id === id) {
      setView(ViewState.DASHBOARD);
    }
  };

  const openEdit = (candidate: Candidate) => {
    setCurrentCandidate(candidate);
    setIsDuplicate(false);
    setView(ViewState.EDIT);
  };

  const handleToggleStatus = async () => {
    if (!currentCandidate) return;
    const newStatus = currentCandidate.status === 'go' ? 'no-go' : 'go';
    const updated = { ...currentCandidate, status: newStatus as 'go' | 'no-go' };
    setCurrentCandidate(updated);
    await handleSave(updated);
  };

  const handleBack = () => {
    setView(ViewState.DASHBOARD);
    setIsDuplicate(false);
  };

  return (
    <div className="h-screen h-dvh bg-slate-50 pb-20 max-w-md mx-auto relative shadow-2xl overflow-y-auto overflow-x-hidden">
      <Header view={view} onBack={handleBack} />
      <div className="h-12" />

      <main className="p-4">
        {view === ViewState.DASHBOARD && (
          <Dashboard
            candidates={candidates}
            filter={filter}
            onFilterChange={setFilter}
            onScanClick={() => setView(ViewState.SCANNER)}
            onCandidateClick={openEdit}
          />
        )}

        {(view === ViewState.REVIEW || view === ViewState.EDIT) && currentCandidate && (
          <CandidateReview
            candidate={currentCandidate}
            isDuplicate={isDuplicate}
            onRetryAnalysis={handleRetryAnalysis}
            onDelete={handleDeleteCandidate}
            onNotesChange={handleNotesChange}
            onSave={handleFieldSave}
          />
        )}
      </main>

      {currentCandidate && (view === ViewState.REVIEW || view === ViewState.EDIT) && (
        <ActionBar
          view={view}
          candidate={currentCandidate}
          onDecision={handleDecision}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {view === ViewState.SCANNER && (
        <Scanner onScan={handleScan} onClose={() => setView(ViewState.DASHBOARD)} />
      )}
    </div>
  );
};

export default App;
