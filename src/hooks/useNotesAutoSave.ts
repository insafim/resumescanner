import { useRef, useCallback } from 'react';
import { Candidate } from '../types';
import { NOTES_AUTOSAVE_DELAY_MS } from '../constants';

interface UseNotesAutoSaveOptions {
  onSave: (candidate: Partial<Candidate> & { id?: string }) => Promise<void>;
}

export function useNotesAutoSave({ onSave }: UseNotesAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveNotes = useCallback((candidateId: string, notes: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await onSave({ id: candidateId, notes } as Candidate);
    }, NOTES_AUTOSAVE_DELAY_MS);
  }, [onSave]);

  return { saveNotes };
}
