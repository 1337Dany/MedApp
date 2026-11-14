/** Tells that the occurrences could not be read (stale: older data is still on screen) and offers to read again. */
export function StaleDataBanner({ error, stale, onRetry }: { error: string; stale: boolean; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
    >
      <p>
        {stale ? 'This may be out of date: the latest data could not be loaded.' : 'The data could not be loaded.'} {error}
      </p>
      <button
        onClick={onRetry}
        className="px-3 py-1 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  );
}
