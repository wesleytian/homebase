import { ReadingNote } from './types';

interface Props {
  notes: ReadingNote[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddNote: () => void;
}

export function ViewNotesModal({ notes, onClose, onDelete, onAddNote }: Props) {
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="view-notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>All Reading Notes</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <button className="add-note-btn-inline" onClick={onAddNote}>
          + Add Note
        </button>

        <div className="notes-list-modal">
          {notes.length === 0 ? (
            <p className="no-notes-message">No notes yet. Add your first reading note!</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-item-content">
                  <p className="note-item-text">{note.content}</p>
                  <div className="note-item-meta">
                    <span className="note-item-source">
                      {isUrl(note.source) ? (
                        <a href={note.source} target="_blank" rel="noopener noreferrer">
                          {new URL(note.source).hostname}
                        </a>
                      ) : (
                        note.source
                      )}
                    </span>
                    <span className="note-item-date">{formatDate(note.createdAt)}</span>
                  </div>
                </div>
                <button
                  className="note-delete-btn"
                  onClick={() => {
                    if (confirm('Delete this note?')) {
                      onDelete(note.id);
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
