import { useState, useEffect, useMemo } from 'react';
import { JournalEntry } from './types';
import { JournalEntryEditor } from './JournalEntryEditor';

interface Props {
  entries: JournalEntry[];
  onBack: () => void;
  onSave: (entry: Partial<JournalEntry> & { date: string }) => void;
}

export function JournalPage({ entries, onBack, onSave }: Props) {
  const [editingEntry, setEditingEntry] = useState<{ entry: JournalEntry | null; date: string } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Find missing days from the last 7 days
  const missingDays = useMemo(() => {
    const existingDates = new Set(entries.map((e) => e.date));
    const missing: { date: string; label: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) {
        const label = i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        missing.push({ date: dateStr, label });
      }
    }
    return missing;
  }, [entries]);

  // Escape key to close editor or go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingEntry) {
          setEditingEntry(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingEntry, onBack]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry({ entry, date: entry.date });
  };

  const handleAddPastEntry = (date: string) => {
    setEditingEntry({ entry: null, date });
    setShowAddMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.add-past-entry-container')) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showAddMenu]);

  return (
    <div className="journal-page">
      <div className="journal-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Gratitude Journal</h1>
        {missingDays.length > 0 && (
          <div className="add-past-entry-container">
            <button
              className="add-past-entry-btn"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              + Add past entry
            </button>
            {showAddMenu && (
              <div className="add-past-entry-menu">
                {missingDays.map(({ date, label }) => (
                  <button
                    key={date}
                    className="add-past-entry-option"
                    onClick={() => handleAddPastEntry(date)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
