import { JournalEntry } from './types';

interface Props {
  entry: JournalEntry | null;
  onOpenEditor: () => void;
  onViewAll: () => void;
}

export function JournalCard({ entry, onOpenEditor, onViewAll }: Props) {
  const morningComplete = entry
    ? [entry.gratefulFor, entry.makeItGreat, entry.affirmations].every(Boolean)
    : false;
  const eveningComplete = entry
    ? [entry.amazingThings, entry.learned].every(Boolean)
    : false;

  const getSnippet = (text: string, maxLen: number = 50) => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  return (
    <div className="journal-card">
      <div className="journal-card-header">
        <div className="journal-card-title">
          <span className="journal-icon">📔</span>
          <span>Today's Journal</span>
        </div>
        <button className="journal-view-all" onClick={onViewAll}>
          View All
        </button>
      </div>

      <div className="journal-card-content" onClick={onOpenEditor}>
        {entry && (entry.gratefulFor || entry.makeItGreat || entry.affirmations) ? (
          <div className="journal-snippets">
            {entry.gratefulFor && (
              <div className="journal-snippet">
                <span className="snippet-label">Grateful for:</span>
                <span className="snippet-text">{getSnippet(entry.gratefulFor)}</span>
              </div>
            )}
            {entry.makeItGreat && (
              <div className="journal-snippet">
                <span className="snippet-label">Make it great:</span>
                <span className="snippet-text">{getSnippet(entry.makeItGreat)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="journal-empty">Click to start today's entry...</div>
        )}
      </div>

      <div className="journal-card-footer">
        <div className="journal-status">
          <span className={`status-pill ${morningComplete ? 'complete' : 'incomplete'}`}>
            {morningComplete ? '✓' : '○'} Morning
          </span>
          <span className={`status-pill ${eveningComplete ? 'complete' : 'incomplete'}`}>
            {eveningComplete ? '✓' : '○'} Evening
          </span>
        </div>
      </div>
    </div>
  );
}
