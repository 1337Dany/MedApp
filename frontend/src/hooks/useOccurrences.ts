import { useCallback, useEffect, useState } from 'react';
import { occurrencesAPI } from '../services/api';
import { useStore } from '../store/useStore';
import { OccurrenceRecord } from '../types';

/**
 * Occurrences that start in [from, to) from the server history (docs/ANALYTICS.md); null until the range is
 * loaded. Re-read after every write that can change them (the store's historyVersion), so edits to the timetable
 * show up; the previous result for the same range stays until then. A failed read keeps that result, reports
 * `error` and can be repeated with `retry`.
 */
export function useOccurrences(from: Date, to: Date) {
  const historyVersion = useStore((state) => state.historyVersion);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; occurrences: OccurrenceRecord[] } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${from.getTime()}-${to.getTime()}`;

  useEffect(() => {
    let current = true;
    occurrencesAPI.get(from, to).then(
      (occurrences) => {
        if (!current) return;
        setLoaded({ key, occurrences });
        setFailure(null);
      },
      (err) => {
        if (current) setFailure({ key, message: err instanceof Error ? err.message : 'Could not load the history.' });
      },
    );
    return () => {
      current = false;
    };
  }, [key, historyVersion, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    occurrences: loaded?.key === key ? loaded.occurrences : null,
    error: failure?.key === key ? failure.message : null,
    retry,
  };
}
