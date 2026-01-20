import { useState } from 'react';

interface Props {
  onSave: (source: string, content: string) => void;
  onClose: () => void;
}

export function AddNoteModal({ onSave, onClose }: Props) {
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source.trim() && content.trim()) {
      onSave(source.trim(), content.trim());
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-note-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Note</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Source (URL or name)</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., https://... or Book Title"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Note</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you learn or want to remember?"
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={!source.trim() || !content.trim()}
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
