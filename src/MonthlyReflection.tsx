import { useState, useEffect, useRef, useCallback } from 'react';
import { MonthlyReflection } from './types';

interface Props {
  reflection: MonthlyReflection | null;
  allReflections: MonthlyReflection[];
  month: string; // YYYY-MM
  onSave: (reflection: Partial<MonthlyReflection> & { month: string }) => void;
  onClose: () => void;
  onChangeMonth: (month: string) => void;
}

const QUESTIONS = [
  { key: 'challenges', label: 'What were the biggest challenges?' },
  { key: 'lookingForward', label: 'What are you looking forward to next month?' },
] as const;

const EXTRA_TEXT_KEYS = ['overallLife'] as const;

const RATING_CATEGORIES = [
  { key: 'ratingOverall', notesKey: 'notesOverall', label: 'Overall' },
  { key: 'ratingHealth', notesKey: 'notesHealth', label: 'Physical Health' },
  { key: 'ratingCareer', notesKey: 'notesCareer', label: 'Career' },
  { key: 'ratingFinances', notesKey: 'notesFinances', label: 'Finances' },
  { key: 'ratingFriends', notesKey: 'notesFriends', label: 'Friends/Social' },
  { key: 'ratingFamily', notesKey: 'notesFamily', label: 'Family' },
  { key: 'ratingRomance', notesKey: 'notesRomance', label: 'Romance' },
  { key: 'ratingFun', notesKey: 'notesFun', label: 'Fun & Recreation' },
  { key: 'ratingGrowth', notesKey: 'notesGrowth', label: 'Personal Growth' },
  { key: 'ratingMentalHealth', notesKey: 'notesMentalHealth', label: 'Mental Health' },
  { key: 'ratingEnvironment', notesKey: 'notesEnvironment', label: 'Home / Environment' },
  { key: 'ratingProductivity', notesKey: 'notesProductivity', label: 'Productivity' },
] as const;

// Categories used for averages (exclude Overall - it's a meta-rating)
const SCORABLE_CATEGORIES = RATING_CATEGORIES.filter(c => c.key !== 'ratingOverall');

// Weights for weighted average (percentages, must sum to 100)
const CATEGORY_WEIGHTS: Record<string, number> = {
  ratingMentalHealth: 16,   // Mental Health
  ratingHealth: 15,         // Physical Health
  ratingRomance: 12,        // Romance
  ratingGrowth: 12,         // Personal Growth
  ratingCareer: 11,         // Career
  ratingFriends: 9,         // Friends/Social
  ratingFinances: 9,        // Finances
  ratingFamily: 6,          // Family
  ratingFun: 4,             // Fun & Recreation
  ratingEnvironment: 3,     // Home / Environment
  ratingProductivity: 2,    // Productivity
};

type RatingKey = typeof RATING_CATEGORIES[number]['key'];
type QuestionKey = typeof QUESTIONS[number]['key'];
type ExtraTextKey = typeof EXTRA_TEXT_KEYS[number];
type NotesKey = `notes${Capitalize<string>}`;
type FormData = Record<QuestionKey, string> & Record<RatingKey, number> & Record<NotesKey, string> & Record<ExtraTextKey, string>;

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
  notesEnvironment: '',
  notesProductivity: '',
  overallLife: '',
};

function computeWeightedAvg(r: MonthlyReflection): number | null {
  const keys = SCORABLE_CATEGORIES.map(c => c.key);
  const rated = keys.filter(k => (r[k as keyof MonthlyReflection] as number) > 0);
  if (rated.length === 0) return null;
  const weightedSum = rated.reduce((sum, k) => sum + (r[k as keyof MonthlyReflection] as number) * (CATEGORY_WEIGHTS[k] || 1), 0);
  const weightSum = rated.reduce((sum, k) => sum + (CATEGORY_WEIGHTS[k] || 1), 0);
  return weightedSum / weightSum;
}

function computeNormalizedScore(current: number, allScores: number[]): number | null {
  if (allScores.length < 2) return null;
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);
  // Raw component: score on 1-10 scale mapped to 0-100 (so 7.0 = 70)
  const raw = current * 10;
  if (max === min) return raw;
  // Relative component: where this month falls in your personal range (with padding)
  const range = max - min;
  const paddedMin = min - range * 0.3;
  const paddedMax = max + range * 0.3;
  const relative = ((current - paddedMin) / (paddedMax - paddedMin)) * 100;
  // Blend: 70% raw score, 30% relative position
  return Math.max(0, Math.min(100, raw * 0.7 + relative * 0.3));
}

export function MonthlyReflectionModal({ reflection, allReflections, month, onSave, onClose, onChangeMonth }: Props) {
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const saveTimeoutRef = useRef<number | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const initializedMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedMonthRef.current === month) return;
    // The reflection prop may lag the month prop (it loads asynchronously when
    // navigating). Wait until it matches the requested month before initializing,
    // otherwise we'd seed the form with the previous month's data and lock it in.
    if (reflection && reflection.month !== month) return;
    initializedMonthRef.current = month;
    if (reflection) {
      setFormData({
        challenges: reflection.challenges,
        lookingForward: reflection.lookingForward,
        ratingOverall: Number(reflection.ratingOverall ?? 0),
        ratingHealth: Number(reflection.ratingHealth ?? 0),
        ratingCareer: Number(reflection.ratingCareer ?? 0),
        ratingFinances: Number(reflection.ratingFinances ?? 0),
        ratingFriends: Number(reflection.ratingFriends ?? 0),
        ratingFamily: Number(reflection.ratingFamily ?? 0),
        ratingRomance: Number(reflection.ratingRomance ?? 0),
        ratingFun: Number(reflection.ratingFun ?? 0),
        ratingGrowth: Number(reflection.ratingGrowth ?? 0),
        ratingMentalHealth: Number(reflection.ratingMentalHealth ?? 0),
        ratingEnvironment: Number(reflection.ratingEnvironment ?? 0),
        ratingProductivity: Number(reflection.ratingProductivity ?? 0),
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
        notesEnvironment: reflection.notesEnvironment ?? '',
        notesProductivity: reflection.notesProductivity ?? '',
        overallLife: reflection.overallLife ?? '',
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
    if (isLocked) return;
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    autoSave(newData);
    const el = textareaRefs.current.get(key);
    if (el) requestAnimationFrame(() => resizeTextarea(el));
  };

  const handleRating = (key: string, value: number) => {
    if (isLocked) return;
    const current = formData[key as RatingKey];
    // Click a number to cycle through: full (n) -> half (n - 0.5) -> cleared (0).
    let newValue: number;
    if (current === value) newValue = value - 0.5;
    else if (current === value - 0.5) newValue = 0;
    else newValue = value;
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
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Reflections are for completed months only; the current month is locked until it ends.
  const maxMonth = getPrevMonth(currentMonth);
  const canGoNext = month < maxMonth;
  const canGoPrev = month > '2026-01';
  const isLocked = month >= currentMonth;

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
    <div className="monthly-reflection-overlay">
      <div className="monthly-reflection-modal">
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
          {isLocked && (
            <div className="monthly-reflection-locked-notice">
              {formatMonth(month)} isn't over yet — you can fill this in once the month ends.
            </div>
          )}
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
                        className={`monthly-rating-dot ${formData[key] >= n ? 'filled' : formData[key] === n - 0.5 ? 'half' : ''}`}
                        onClick={() => handleRating(key, n)}
                        disabled={isLocked}
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
                    disabled={isLocked}
                  />
                </div>
              </div>
            ))}

            {/* Average scores */}
            {(() => {
              const rated = SCORABLE_CATEGORIES.filter(c => formData[c.key] > 0);
              if (rated.length === 0) return null;

              const avg = rated.reduce((sum, c) => sum + formData[c.key], 0) / rated.length;

              const weightedSum = rated.reduce((sum, c) => sum + formData[c.key] * (CATEGORY_WEIGHTS[c.key] || 1), 0);
              const weightSum = rated.reduce((sum, c) => sum + (CATEGORY_WEIGHTS[c.key] || 1), 0);
              const weightedAvg = weightedSum / weightSum;

              // Compute normalized score from all historical reflections
              const allScores = allReflections
                .map(r => computeWeightedAvg(r))
                .filter((s): s is number => s !== null);
              const normalized = computeNormalizedScore(weightedAvg, allScores);

              return (
                <div className="monthly-averages">
                  <div className="monthly-average-row">
                    <span className="monthly-average-label">Average</span>
                    <span className="monthly-average-value">{avg.toFixed(1)}</span>
                  </div>
                  <div className="monthly-average-row">
                    <span className="monthly-average-label">Weighted Average</span>
                    <span className="monthly-average-value">{weightedAvg.toFixed(1)}</span>
                  </div>
                  {normalized !== null && (
                    <div className="monthly-average-row">
                      <span className="monthly-average-label">Normalized</span>
                      <span className="monthly-average-value monthly-normalized-score">{Math.round(normalized)}<span className="monthly-normalized-unit">/100</span></span>
                    </div>
                  )}
                  <div className="monthly-weights-info">
                    Weights: {SCORABLE_CATEGORIES.map(c =>
                      `${c.label} ${CATEGORY_WEIGHTS[c.key]}%`
                    ).join(', ')}
                  </div>

                  <div className="monthly-reflection-question" style={{ marginTop: 16 }}>
                    <label>How do I feel I'm doing overall in life?</label>
                    <textarea
                      ref={setTextareaRef('overallLife')}
                      value={formData['overallLife' as keyof FormData] as string || ''}
                      onChange={(e) => handleChange('overallLife', e.target.value)}
                      placeholder="Write your thoughts..."
                      disabled={isLocked}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {QUESTIONS.map(({ key, label }) => (
            <div key={key} className="monthly-reflection-question">
              <label>{label}</label>
              <textarea
                ref={setTextareaRef(key)}
                value={formData[key as QuestionKey]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="Write your thoughts..."
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
