import { useEffect, useState } from 'react';
import { occurrencesAPI } from '../services/api';
import { useStore } from '../store/useStore';
import { OccurrenceRecord } from '../types';

/**
 * Occurrences that start in [from, to) from the server history (docs/ANALYTICS.md); null until the range is
 * loaded. Re-read whenever the store's activities change, so edits to the timetable show up; the previous result
 * for the same range stays until then.
 */
export function useOccurrences(from: Date, to: Date) {
  const activities = useStore((state) => state.activities);
  const [loaded, setLoaded] = useState<{ key: string; occurrences: OccurrenceRecord[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${from.getTime()}-${to.getTime()}`;

  useEffect(() => {
    let current = true;
    occurrencesAPI.get(from, to).then(
      (occurrences) => {
        if (!current) return;
        setLoaded({ key, occurrences });
        setError(null);
      },
      (err) => {
        if (current) setError(err instanceof Error ? err.message : 'Could not load the history.');
      },
    );
    return () => {
      current = false;
    };
  }, [key, activities]);

  return { occurrences: loaded?.key === key ? loaded.occurrences : null, error };
}
