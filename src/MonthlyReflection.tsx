import { useState, useEffect, useRef, useCallback } from 'react';
import { MonthlyReflection } from './types';

interface Props {
  reflection: MonthlyReflection | null;
  month: string; // YYYY-MM
  onSave: (reflection: Partial<MonthlyReflection> & { month: string }) => void;
  onClose: () => void;
  onChangeMonth: (month: string) => void;
}

const QUESTIONS = [
  { key: 'challenges', label: 'What were the biggest challenges?' },
  { key: 'lookingForward', label: 'What are you looking forward to next month?' },
] as const;

const RATING_CATEGORIES = [
  { key: 'ratingOverall', notesKey: 'notesOverall', label: 'Overall' },
  { key: 'ratingHealth', notesKey: 'notesHealth', label: 'Health' },
  { key: 'ratingCareer', notesKey: 'notesCareer', label: 'Career' },
  { key: 'ratingFinances', notesKey: 'notesFinances', label: 'Finances' },
  { key: 'ratingFriends', notesKey: 'notesFriends', label: 'Friends' },
  { key: 'ratingFamily', notesKey: 'notesFamily', label: 'Family' },
  { key: 'ratingRomance', notesKey: 'notesRomance', label: 'Romance' },
  { key: 'ratingFun', notesKey: 'notesFun', label: 'Fun & Recreation' },
  { key: 'ratingGrowth', notesKey: 'notesGrowth', label: 'Personal Growth' },
  { key: 'ratingMentalHealth', notesKey: 'notesMentalHealth', label: 'Mental Health' },
  { key: 'ratingSpirituality', notesKey: 'notesSpirituality', label: 'Spirituality' },
  { key: 'ratingEnvironment', notesKey: 'notesEnvironment', label: 'Home / Environment' },
  { key: 'ratingProductivity', notesKey: 'notesProductivity', label: 'Productivity' },
] as const;

type RatingKey = typeof RATING_CATEGORIES[number]['key'];
type QuestionKey = typeof QUESTIONS[number]['key'];
type NotesKey = `notes${Capitalize<string>}`;
type FormData = Record<QuestionKey, string> & Record<RatingKey, number> & Record<NotesKey, string>;

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getPrevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT_FORM: FormData = {
  challenges: '',
  lookingForward: '',
  ratingOverall: 0,
  ratingHealth: 0,
  ratingCareer: 0,
  ratingFinances: 0,
  ratingFriends: 0,
  ratingFamily: 0,
  ratingRomance: 0,
  ratingFun: 0,
  ratingGrowth: 0,
  ratingMentalHealth: 0,
  ratingSpirituality: 0,
  ratingEnvironment: 0,
  ratingProductivity: 0,
  notesOverall: '',
  notesHealth: '',
  notesCareer: '',
  notesFinances: '',
  notesFriends: '',
  notesFamily: '',
  notesRomance: '',
  notesFun: '',
  notesGrowth: '',
  notesMentalHealth: '',
  notesSpirituality: '',
  notesEnvironment: '',
  notesProductivity: '',
};

export function MonthlyReflectionModal({ reflection, month, onSave, onClose, onChangeMonth }: Props) {
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const saveTimeoutRef = useRef<number | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const initializedMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedMonthRef.current === month) return;
    initializedMonthRef.current = month;
    if (reflection) {
      setFormData({
        challenges: reflection.challenges,
        lookingForward: reflection.lookingForward,
        ratingOverall: reflection.ratingOverall ?? 0,
        ratingHealth: reflection.ratingHealth ?? 0,
        ratingCareer: reflection.ratingCareer ?? 0,
        ratingFinances: reflection.ratingFinances ?? 0,
        ratingFriends: reflection.ratingFriends ?? 0,
        ratingFamily: reflection.ratingFamily ?? 0,
        ratingRomance: reflection.ratingRomance ?? 0,
        ratingFun: reflection.ratingFun ?? 0,
        ratingGrowth: reflection.ratingGrowth ?? 0,
        ratingMentalHealth: reflection.ratingMentalHealth ?? 0,
        ratingSpirituality: reflection.ratingSpirituality ?? 0,
        ratingEnvironment: reflection.ratingEnvironment ?? 0,
        ratingProductivity: reflection.ratingProductivity ?? 0,
        notesOverall: reflection.notesOverall ?? '',
        notesHealth: reflection.notesHealth ?? '',
        notesCareer: reflection.notesCareer ?? '',
        notesFinances: reflection.notesFinances ?? '',
        notesFriends: reflection.notesFriends ?? '',
        notesFamily: reflection.notesFamily ?? '',
        notesRomance: reflection.notesRomance ?? '',
        notesFun: reflection.notesFun ?? '',
        notesGrowth: reflection.notesGrowth ?? '',
        notesMentalHealth: reflection.notesMentalHealth ?? '',
        notesSpirituality: reflection.notesSpirituality ?? '',
        notesEnvironment: reflection.notesEnvironment ?? '',
        notesProductivity: reflection.notesProductivity ?? '',
      });
    } else {
      setFormData({ ...DEFAULT_FORM });
    }
  }, [reflection, month]);

  const resizeTextarea = useCallback((el: HTMLTextAreaElement) => {
    const scrollParent = el.closest('.monthly-reflection-content');
    const scrollTop = scrollParent?.scrollTop ?? 0;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    if (scrollParent) scrollParent.scrollTop = scrollTop;
  }, []);

  const autoSave = useCallback((data: FormData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave({ ...data, month });
      setSaveStatus('saved');
      savedTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);
  }, [month, onSave]);

  const handleChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    autoSave(newData);
    const el = textareaRefs.current.get(key);
    if (el) requestAnimationFrame(() => resizeTextarea(el));
  };

  const handleRating = (key: string, value: number) => {
    const current = formData[key as RatingKey];
    // Click same value to clear it
    const newValue = current === value ? 0 : value;
    const newData = { ...formData, [key]: newValue };
    setFormData(newData);
    autoSave(newData);
  };

  const setTextareaRef = (key: string) => (el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(key, el);
      resizeTextarea(el);
    }
  };

  const handleNav = (direction: 'prev' | 'next') => {
    // Flush pending save for current month
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      onSave({ ...formData, month });
    }
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
    setSaveStatus('idle');
    initializedMonthRef.current = null;
    const newMonth = direction === 'prev' ? getPrevMonth(month) : getNextMonth(month);
    onChangeMonth(newMonth);
  };

  const now = new Date();
  // Only allow up to previous month, unless it's first Sunday then current month's prev is available
  // But never allow future months - only months where first Sunday has passed
  const isFirstSundayOrLater = (() => {
    // For a given month M, the reflection is for M and becomes available on first Sunday of M+1
    // So max allowed month = last month where first Sunday of (month+1) has already happened
    // i.e. if today is first Sunday of March, max = Feb
    // Simplification: max month = previous month of current date
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  })();
  const canGoNext = month < isFirstSundayOrLater;
  const canGoPrev = month > '2026-01';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  return (
    <div className="monthly-reflection-overlay" onClick={onClose}>
      <div className="monthly-reflection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="monthly-reflection-header">
          <div className="monthly-reflection-nav">
            <button className="monthly-nav-btn" onClick={() => handleNav('prev')} disabled={!canGoPrev}>{'\u2039'}</button>
            <h2>{formatMonth(month)}</h2>
            <button className="monthly-nav-btn" onClick={() => handleNav('next')} disabled={!canGoNext}>{'\u203a'}</button>
          </div>
          <div className="monthly-reflection-header-right">
            {saveStatus !== 'idle' && (
              <span className={`auto-save-indicator ${saveStatus}`}>
                {saveStatus === 'saving' ? 'Saving...' : '\u2713 Saved'}
              </span>
            )}
            <button className="monthly-reflection-close" onClick={onClose}>{'\u00d7'}</button>
          </div>
        </div>

        <div className="monthly-reflection-content">
          <div className="monthly-reflection-ratings">
            <label className="monthly-reflection-ratings-title">Rate your month</label>
            {RATING_CATEGORIES.map(({ key, notesKey, label }) => (
              <div key={key} className="monthly-rating-group">
                <div className="monthly-rating-row">
                  <span className="monthly-rating-label">{label}</span>
                  <div className="monthly-rating-dots">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        className={`monthly-rating-dot ${formData[key] >= n ? 'filled' : ''}`}
                        onClick={() => handleRating(key, n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="monthly-rating-notes">
                  <textarea
                    ref={setTextareaRef(notesKey)}
                    className="monthly-rating-notes-input"
                    value={formData[notesKey as NotesKey] || ''}
                    onChange={(e) => handleChange(notesKey, e.target.value)}
                    placeholder="Notes..."
                    rows={1}
                  />
                </div>
              </div>
            ))}
          </div>

          {QUESTIONS.map(({ key, label }) => (
            <div key={key} className="monthly-reflection-question">
              <label>{label}</label>
              <textarea
                ref={setTextareaRef(key)}
                value={formData[key as QuestionKey]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="Write your thoughts..."
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
