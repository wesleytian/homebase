import { ReadingNote } from './types';

interface Props {
  note: ReadingNote | null;
  onAddNote: () => void;
  onViewAll: () => void;
}

export function RandomInsightCard({ note, onAddNote, onViewAll }: Props) {
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <div className="insight-card-title">
          <span className="insight-icon">💡</span>
          <span>Reading Notes</span>
        </div>
        <div className="insight-actions">
          <button className="insight-view-all-btn" onClick={onViewAll}>
            View All
          </button>
          <button className="insight-add-btn" onClick={onAddNote}>
            + Add
          </button>
        </div>
      </div>

      <div className="insight-card-content">
        {note ? (
          <>
            <p className="insight-text">{note.content}</p>
            <div className="insight-source">
              {isUrl(note.source) ? (
                <a href={note.source} target="_blank" rel="noopener noreferrer">
                  {new URL(note.source).hostname}
                </a>
              ) : (
                <span>— {note.source}</span>
              )}
            </div>
          </>
        ) : (
          <p className="insight-empty">No notes yet. Add your first reading note!</p>
        )}
      </div>
    </div>
  );
}
