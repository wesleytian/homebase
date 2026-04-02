import { useState, useEffect, useRef, useCallback } from 'react';
import { JournalEntry } from './types';
import { getRandomAffirmations } from './affirmations';

interface Props {
  entry: JournalEntry | null;
  date: string;
  onSave: (entry: Partial<JournalEntry> & { date: string }) => void;
  onClose: () => void;
}

const MORNING_QUESTIONS = [
  { key: 'gratefulFor', label: 'What are you grateful for?' },
  { key: 'makeItGreat', label: 'What will make today great?' },
  { key: 'affirmations', label: 'Daily affirmations' },
] as const;

const EVENING_QUESTIONS = [
  { key: 'amazingThings', label: 'Amazing things that happened today' },
  { key: 'learned', label: 'What did I learn today?' },
] as const;

export function JournalEntryEditor({ entry, date, onSave, onClose }: Props) {
  const [formData, setFormData] = useState({
    gratefulFor: '',
    makeItGreat: '',
    affirmations: '',
    amazingThings: '',
    learned: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [inspoAffirmations, setInspoAffirmations] = useState<string[] | null>(null);
  const [inspoExpanded, setInspoExpanded] = useState(true);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const saveTimeoutRef = useRef<number | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  // Only sync from props on initial load, not on subsequent updates
  // This prevents the race condition where saved data overwrites newer typed content
  useEffect(() => {
    if (entry && !initializedRef.current) {
      initializedRef.current = true;
      setFormData({
        gratefulFor: entry.gratefulFor,
        makeItGreat: entry.makeItGreat,
        affirmations: entry.affirmations,
        amazingThings: entry.amazingThings,
        learned: entry.learned,
      });
    }
  }, [entry]);

  // Auto-resize textareas on content change
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
      }
    });
  }, [formData]);

  const autoSave = useCallback((data: typeof formData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave({ ...data, date });
      setSaveStatus('saved');
      savedTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);
  }, [date, onSave]);

  const handleChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    autoSave(newData);
  };

  const setTextareaRef = (key: string) => (el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(key, el);
      el.style.height = 'auto';
      el.style.height = Math.max(60, el.scrollHeight) + 'px';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="journal-editor-overlay" onClick={onClose}>
      <div className="journal-editor" onClick={(e) => e.stopPropagation()}>
        <div className="journal-editor-header">
          <h2>{formatDate(date)}</h2>
          <div className="journal-header-right">
            {saveStatus !== 'idle' && (
              <span className={`auto-save-indicator ${saveStatus}`}>
                {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
              </span>
            )}
            <button className="journal-close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="journal-editor-content">
          <div className="journal-section">
            <h3>☀️ Morning</h3>
            {MORNING_QUESTIONS.map(({ key, label }) => (
              <div key={key} className="journal-question">
                <label>
                  {label}
                  {key === 'affirmations' && (
                    <button
                      className="journal-inspire-btn"
                      onClick={() => setInspoAffirmations(getRandomAffirmations(5))}
                    >
                      Inspire me
                    </button>
                  )}
                </label>
                {key === 'affirmations' && inspoAffirmations && (
                  <div className="journal-inspo-list">
                    <div className="journal-inspo-header" onClick={() => setInspoExpanded(!inspoExpanded)}>
                      <span>{inspoExpanded ? '▾' : '▸'} Affirmations</span>
                    </div>
                    {inspoExpanded && inspoAffirmations.map((a, i) => (
                      <div key={i} className="journal-inspo-item">"{a}"</div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={setTextareaRef(key)}
                  value={formData[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="Write your thoughts..."
                />
              </div>
            ))}
          </div>

          <div className="journal-section">
            <h3>🌙 Evening</h3>
            {EVENING_QUESTIONS.map(({ key, label }) => (
              <div key={key} className="journal-question">
                <label>{label}</label>
                <textarea
                  ref={setTextareaRef(key)}
                  value={formData[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="Write your thoughts..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
