import { useState } from 'react';
import { JournalEntry } from './types';
import { JournalEntryEditor } from './JournalEntryEditor';

interface Props {
  entries: JournalEntry[];
  onBack: () => void;
  onSave: (entry: Partial<JournalEntry> & { date: string }) => void;
}

export function JournalPage({ entries, onBack, onSave }: Props) {
  const [editingEntry, setEditingEntry] = useState<{ entry: JournalEntry | null; date: string } | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry({ entry, date: entry.date });
  };

  return (
    <div className="journal-page">
      <div className="journal-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Gratitude Journal</h1>
      </div>

      <div className="journal-entries">
        {entries.length === 0 ? (
          <div className="journal-empty-state">
            <p>No journal entries yet. Start writing today!</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="journal-entry-card" onClick={() => handleEditEntry(entry)}>
              <div className="entry-date">{formatDate(entry.date)}</div>

              <div className="entry-content">
                {entry.gratefulFor && (
                  <div className="entry-section">
                    <span className="entry-label">Grateful for</span>
                    <p>{entry.gratefulFor}</p>
                  </div>
                )}

                {entry.makeItGreat && (
                  <div className="entry-section">
                    <span className="entry-label">What made it great</span>
                    <p>{entry.makeItGreat}</p>
                  </div>
                )}

                {entry.affirmations && (
                  <div className="entry-section">
                    <span className="entry-label">Affirmations</span>
                    <p>{entry.affirmations}</p>
                  </div>
                )}

                {entry.amazingThings && (
                  <div className="entry-section">
                    <span className="entry-label">Amazing things</span>
                    <p>{entry.amazingThings}</p>
                  </div>
                )}

                {entry.learned && (
                  <div className="entry-section">
                    <span className="entry-label">What I learned</span>
                    <p>{entry.learned}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editingEntry && (
        <JournalEntryEditor
          entry={editingEntry.entry}
          date={editingEntry.date}
          onSave={onSave}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
