import { useState, useEffect, useRef } from 'react';
import {
  HealthItem,
  HealthSection,
  HEALTH_SECTION_META,
  QUICK_FACT_SUGGESTIONS,
  TEST_SUGGESTIONS,
  TEST_FREQUENCIES,
  MONTH_LABELS,
  parseMonthSchedule,
  serializeMonthSchedule,
  frequencyTone,
  findTestSuggestion,
} from './types';

type UpdateFields = Partial<Pick<HealthItem, 'name' | 'value' | 'link' | 'date' | 'whereAt' | 'frequency' | 'emoji' | 'priority' | 'notes'>>;

interface Props {
  items: HealthItem[];
  onBack: () => void;
  onAdd: (section: HealthSection, name: string, extras?: { emoji?: string; priority?: string; frequency?: string; notes?: string }) => Promise<HealthItem | void>;
  onUpdate: (id: string, updates: UpdateFields) => void;
  onDelete: (id: string) => void;
  testNotes: string;
  onTestNotesChange: (notes: string) => void;
}

export function HealthPage({ items, onBack, onAdd, onUpdate, onDelete, testNotes, onTestNotesChange }: Props) {
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showLowPriority, setShowLowPriority] = useState(false);
  const [historyForId, setHistoryForId] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const migratedRef = useRef(false);

  // One-time auto-migration: backfill emoji / frequency / canonical name / notes
  // for items whose name matches a known suggestion.
  useEffect(() => {
    if (migratedRef.current) return;
    const tests = items.filter((i) => i.section === 'test');
    if (tests.length === 0) return;
    for (const item of tests) {
      const sugg = findTestSuggestion(item.name);
      if (!sugg) continue;
      const updates: UpdateFields = {};
      if (!item.emoji) updates.emoji = sugg.emoji;
      if (!item.frequency) updates.frequency = sugg.frequency;
      if (item.name !== sugg.name) updates.name = sugg.name;
      if (!item.notes && sugg.details) updates.notes = sugg.details;
      if (Object.keys(updates).length > 0) onUpdate(item.id, updates);
    }
    migratedRef.current = true;
  }, [items, onUpdate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (historyForId) setHistoryForId(null);
        else if (expandedTestId) setExpandedTestId(null);
        else onBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBack, expandedTestId, historyForId]);

  useEffect(() => {
    if (pendingFocusId) {
      const input = inputRefs.current.get(pendingFocusId);
      if (input) {
        input.focus();
        setPendingFocusId(null);
      }
    }
  }, [pendingFocusId, items]);

  const itemsBySection = (s: HealthSection) =>
    items.filter((i) => i.section === s).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAddItem = async (section: HealthSection, name: string, extras: { emoji?: string; priority?: string; frequency?: string; notes?: string }, focusField: 'name' | 'value' = 'value', expandAfter = false) => {
    const created = await onAdd(section, name, extras);
    if (created && typeof created === 'object' && 'id' in created) {
      if (expandAfter) setExpandedTestId(created.id);
      else setPendingFocusId(`${created.id}-${focusField}`);
    }
  };

  const historyItem = items.find((i) => i.id === historyForId);

  return (
    <div className="health-page">
      <div className="health-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Health</h1>
      </div>

      {HEALTH_SECTION_META.map((meta) => {
        const sectionItems = itemsBySection(meta.key);
        const isTests = meta.schedule === 'months';

        if (isTests) {
          return (
            <TestsSection
              key={meta.key}
              items={sectionItems}
              expandedId={expandedTestId}
              setExpandedId={setExpandedTestId}
              showLow={showLowPriority}
              setShowLow={setShowLowPriority}
              onAdd={(name, extras) => handleAddItem('test', name, extras, 'name', !name)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onOpenHistory={(id) => setHistoryForId(id)}
              registerRef={(key, el) => {
                if (el) inputRefs.current.set(key, el);
                else inputRefs.current.delete(key);
              }}
              testNotes={testNotes}
              onTestNotesChange={onTestNotesChange}
            />
          );
        }

        // Simple section (facts, supplements, medkit, records)
        const suggestions = (meta.key === 'fact' ? QUICK_FACT_SUGGESTIONS : []).filter(
          (s) => !sectionItems.some((i) => i.name.toLowerCase() === s.toLowerCase())
        );
        return (
          <section key={meta.key} className="health-section">
            <div className="health-section-header">
              <h2>
                <span className="health-section-icon">{meta.icon}</span>
                {meta.label}
              </h2>
              <span className="health-section-hint">{meta.hint}</span>
            </div>

            {sectionItems.length === 0 && suggestions.length > 0 && (
              <div className="health-suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="health-suggestion-chip"
                    onClick={() => handleAddItem(meta.key, s, {}, 'value')}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <div className="health-items">
              {sectionItems.map((item) => (
                <HealthItemRow
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  registerRef={(field, el) => {
                    const key = `${item.id}-${field}`;
                    if (el) inputRefs.current.set(key, el);
                    else inputRefs.current.delete(key);
                  }}
                />
              ))}
            </div>

            {sectionItems.length > 0 && suggestions.length > 0 && (
              <div className="health-suggestions health-suggestions-compact">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="health-suggestion-chip"
                    onClick={() => handleAddItem(meta.key, s, {}, 'value')}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <button
              className="health-add-btn"
              onClick={() => handleAddItem(meta.key, '', {}, 'name')}
            >
              + Add {meta.key === 'fact' ? 'custom fact' : meta.label.toLowerCase().replace(/s$/, '')}
            </button>
          </section>
        );
      })}

      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryForId(null)}
          onChange={(dates) => onUpdate(historyItem.id, { value: dates.join(',') })}
        />
      )}
    </div>
  );
}

// ── Simple row (facts/supplements/medkit/records) ────────────────────────────

interface SimpleRowProps {
  item: HealthItem;
  onUpdate: (id: string, updates: UpdateFields) => void;
  onDelete: (id: string) => void;
  registerRef: (field: 'name' | 'value', el: HTMLInputElement | null) => void;
}

function HealthItemRow({ item, onUpdate, onDelete, registerRef }: SimpleRowProps) {
  const [name, setName] = useState(item.name);
  const [value, setValue] = useState(item.value);
  const [link, setLink] = useState(item.link);

  useEffect(() => { setName(item.name); }, [item.name]);
  useEffect(() => { setValue(item.value); }, [item.value]);
  useEffect(() => { setLink(item.link); }, [item.link]);

  const commit = (field: 'name' | 'value' | 'link', newVal: string, oldVal: string) => {
    if (newVal !== oldVal) onUpdate(item.id, { [field]: newVal });
  };

  return (
    <div className="health-item-row">
      <div className="health-item-main">
        <input
          ref={(el) => registerRef('name', el)}
          className="health-item-name"
          value={name}
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => commit('name', name, item.name)}
        />
        <input
          ref={(el) => registerRef('value', el)}
          className="health-item-value"
          value={value}
          placeholder="Notes"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit('value', value, item.value)}
        />
      </div>
      <div className="health-item-meta">
        <input
          className="health-item-link"
          value={link}
          placeholder="https://… (optional)"
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => commit('link', link, item.link)}
        />
        {link && (
          <a className="health-item-link-open" href={link} target="_blank" rel="noopener noreferrer" title="Open link">↗</a>
        )}
        <button
          className="health-item-delete"
          onClick={() => onDelete(item.id)}
          title="Delete"
        >×</button>
      </div>
    </div>
  );
}

// ── Tests section: priority+frequency groups ─────────────────────────────────

interface TestsSectionProps {
  items: HealthItem[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  showLow: boolean;
  setShowLow: (v: boolean) => void;
  onAdd: (name: string, extras: { emoji?: string; priority?: string; frequency?: string; notes?: string }) => Promise<void>;
  onUpdate: (id: string, updates: UpdateFields) => void;
  onDelete: (id: string) => void;
  onOpenHistory: (id: string) => void;
  registerRef: (key: string, el: HTMLInputElement | null) => void;
  testNotes: string;
  onTestNotesChange: (notes: string) => void;
}

function TestsSection({ items, expandedId, setExpandedId, showLow, setShowLow, onAdd, onUpdate, onDelete, onOpenHistory, registerRef, testNotes, onTestNotesChange }: TestsSectionProps) {
  const [notesDraft, setNotesDraft] = useState(testNotes);
  const [notesExpanded, setNotesExpanded] = useState(false);
  useEffect(() => { setNotesDraft(testNotes); }, [testNotes]);

  const recurring = items.filter((i) => i.priority !== 'low' && i.frequency !== 'one-time');
  const oneTime = items.filter((i) => i.priority !== 'low' && i.frequency === 'one-time');
  const later = items.filter((i) => i.priority === 'low');

  const suggestions = TEST_SUGGESTIONS.filter(
    (s) => !items.some((i) => i.name.toLowerCase() === s.name.toLowerCase())
  );
  const recurringSuggestions = suggestions.filter((s) => s.priority !== 'low' && s.frequency !== 'one-time');
  const oneTimeSuggestions = suggestions.filter((s) => s.priority !== 'low' && s.frequency === 'one-time');
  const laterSuggestions = suggestions.filter((s) => s.priority === 'low');

  const renderSuggestionChip = (s: typeof TEST_SUGGESTIONS[number], extras: { priority?: string }) => (
    <button
      key={s.name}
      className="health-suggestion-chip"
      onClick={() => onAdd(s.name, { emoji: s.emoji, frequency: s.frequency, notes: s.details, ...extras })}
    >
      <span className="health-suggestion-emoji">{s.emoji}</span> {s.name}
    </button>
  );

  return (
    <section className="health-section">
      <div className="health-section-header">
        <h2>
          <span className="health-section-icon">🧪</span>
          Tests & Scans
        </h2>
        <span className="health-section-hint">
          Recurring tests you should be doing. Click the chips to edit.
        </span>
      </div>

      <div className="health-test-notes-wrap">
        <button
          type="button"
          className="health-test-notes-toggle"
          onClick={() => setNotesExpanded((v) => !v)}
        >
          <span className={`collapse-arrow ${notesExpanded ? 'open' : ''}`}>▶</span>
          <span>Notes & research</span>
          {notesDraft.trim().length > 0 && !notesExpanded && (
            <span className="health-test-notes-preview">
              {notesDraft.slice(0, 120)}{notesDraft.length > 120 ? '…' : ''}
            </span>
          )}
        </button>
        {notesExpanded && (
          <textarea
            className="health-test-notes-textarea"
            value={notesDraft}
            placeholder="Brain-dump any research, doctor's recommendations, or context here. Saves automatically."
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => { if (notesDraft !== testNotes) onTestNotesChange(notesDraft); }}
            rows={10}
          />
        )}
      </div>

      <TestGroup
        title="Recurring"
        defaultOpen
        items={recurring}
        suggestions={recurringSuggestions}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onOpenHistory={onOpenHistory}
        registerRef={registerRef}
        renderSuggestion={(s) => renderSuggestionChip(s, {})}
        onAddBlank={() => onAdd('', {})}
        addLabel="+ Add test"
      />

      <TestGroup
        title="One-time"
        subtitle="Baseline tests you do once"
        defaultOpen
        items={oneTime}
        suggestions={oneTimeSuggestions}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onOpenHistory={onOpenHistory}
        registerRef={registerRef}
        renderSuggestion={(s) => renderSuggestionChip(s, {})}
        onAddBlank={() => onAdd('', {})}
        addLabel="+ Add one-time test"
      />

      <TestGroup
        title="Later in life"
        subtitle="Add to active when you're closer to the recommended age"
        controlled
        open={showLow}
        onToggle={() => setShowLow(!showLow)}
        items={later}
        suggestions={laterSuggestions}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onOpenHistory={onOpenHistory}
        registerRef={registerRef}
        renderSuggestion={(s) => renderSuggestionChip(s, { priority: 'low' })}
        onAddBlank={() => onAdd('', { priority: 'low' })}
        addLabel="+ Add later-in-life test"
      />
    </section>
  );
}

interface TestGroupProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  controlled?: boolean;
  open?: boolean;
  onToggle?: () => void;
  items: HealthItem[];
  suggestions: typeof TEST_SUGGESTIONS;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onUpdate: (id: string, updates: UpdateFields) => void;
  onDelete: (id: string) => void;
  onOpenHistory: (id: string) => void;
  registerRef: (key: string, el: HTMLInputElement | null) => void;
  renderSuggestion: (s: typeof TEST_SUGGESTIONS[number]) => React.ReactNode;
  onAddBlank: () => void;
  addLabel: string;
}

function TestGroup({
  title, subtitle, defaultOpen = true, controlled = false, open: openProp, onToggle,
  items, suggestions, expandedId, setExpandedId,
  onUpdate, onDelete, onOpenHistory, registerRef, renderSuggestion, onAddBlank, addLabel,
}: TestGroupProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = controlled ? !!openProp : localOpen;
  const toggle = controlled ? onToggle! : () => setLocalOpen(!localOpen);

  if (items.length === 0 && suggestions.length === 0) return null;

  return (
    <div className="health-test-group">
      <button type="button" className="health-test-group-header" onClick={toggle}>
        <span className={`collapse-arrow ${open ? 'open' : ''}`}>▶</span>
        <span className="health-test-group-title">{title}</span>
        {items.length > 0 && <span className="health-test-group-count">{items.length}</span>}
        {subtitle && <span className="health-test-group-subtitle">{subtitle}</span>}
      </button>

      {open && (
        <>
          {items.length > 0 && (
            <div className="health-test-grid">
              {items.map((item) => (
                <TestCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onOpenHistory={() => onOpenHistory(item.id)}
                  registerRef={registerRef}
                />
              ))}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="health-suggestions health-suggestions-compact">
              {suggestions.map((s) => renderSuggestion(s))}
            </div>
          )}
          <button className="health-add-btn" onClick={onAddBlank}>{addLabel}</button>
        </>
      )}
    </div>
  );
}

// ── Collapsible test card with inline chip editing ───────────────────────────

interface TestCardProps {
  item: HealthItem;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (id: string, updates: UpdateFields) => void;
  onDelete: (id: string) => void;
  onOpenHistory: () => void;
  registerRef: (key: string, el: HTMLInputElement | null) => void;
}

function TestCard({ item, expanded, onExpand, onUpdate, onDelete, onOpenHistory, registerRef }: TestCardProps) {
  const months = parseMonthSchedule(item.date);
  const monthsLabel = months.size === 0
    ? null
    : months.size === 12
    ? 'Every month'
    : Array.from(months).sort((a, b) => a - b).map((m) => MONTH_LABELS[m - 1]).join(', ');
  const freqLabel = TEST_FREQUENCIES.find((f) => f.value === item.frequency)?.label || 'Set frequency';
  const suggestion = findTestSuggestion(item.name);
  const displayEmoji = item.emoji || suggestion?.emoji || '🧪';
  const needsScheduling = months.size === 0;
  const tone = frequencyTone(item.frequency);
  const historyCount = (item.value || '').split(',').map((s) => s.trim()).filter(Boolean).length;

  return (
    <div className={`health-test-card ${expanded ? 'expanded' : ''}`}>
      {/* Row 1: emoji + name + caret (always same height) */}
      <div className="health-test-row1" onClick={onExpand}>
        <span className="health-test-emoji">{displayEmoji}</span>
        {expanded ? (
          <EmojiNameEditor item={item} onUpdate={onUpdate} registerRef={registerRef} />
        ) : (
          <span className="health-test-name">{item.name || 'Untitled test'}</span>
        )}
        {item.link && (
          <a
            className="health-test-link-icon"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open link"
          >↗</a>
        )}
        <span className={`health-test-caret ${expanded ? 'open' : ''}`}>▾</span>
      </div>

      {/* Row 2: chips (always present, same height) */}
      <div className="health-test-row2" onClick={(e) => e.stopPropagation()}>
        <ChipPopover
          label={freqLabel === 'Frequency…' ? 'Set frequency' : freqLabel}
          chipClass={`tone-${tone}`}
          options={TEST_FREQUENCIES.filter((f) => f.value !== '')}
          value={item.frequency}
          onChange={(v) => onUpdate(item.id, { frequency: v })}
        />
        <MonthChip
          months={months}
          label={monthsLabel}
          onChange={(next) => onUpdate(item.id, { date: serializeMonthSchedule(next) })}
        />
        {needsScheduling && (
          <span className="health-test-chip tone-warn" title="Pick the months you do this test">⚠</span>
        )}
      </div>

      {expanded && (
        <div className="health-test-expanded" onClick={(e) => e.stopPropagation()}>
          <PriorityChip item={item} onUpdate={onUpdate} />
          <LinkField item={item} onUpdate={onUpdate} />
          <WhereField item={item} onUpdate={onUpdate} />
          <div className="health-test-actions">
            <button className="health-test-action" onClick={onOpenHistory}>
              📜 History {historyCount > 0 && <span className="health-test-action-count">{historyCount}</span>}
            </button>
            <button className="health-test-action health-test-action-danger" onClick={() => onDelete(item.id)}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-fields used inside expanded card ─────────────────────────────────────

function EmojiNameEditor({ item, onUpdate, registerRef }: { item: HealthItem; onUpdate: (id: string, u: UpdateFields) => void; registerRef: (key: string, el: HTMLInputElement | null) => void; }) {
  const [emoji, setEmoji] = useState(item.emoji);
  const [name, setName] = useState(item.name);
  useEffect(() => { setEmoji(item.emoji); }, [item.emoji]);
  useEffect(() => { setName(item.name); }, [item.name]);
  return (
    <span className="health-test-name-edit">
      <input
        className="health-test-emoji-input"
        value={emoji}
        placeholder="🧪"
        maxLength={4}
        onChange={(e) => setEmoji(e.target.value)}
        onBlur={() => { if (emoji !== item.emoji) onUpdate(item.id, { emoji }); }}
        onClick={(e) => e.stopPropagation()}
      />
      <input
        ref={(el) => registerRef(`${item.id}-name`, el)}
        className="health-test-name-input"
        value={name}
        placeholder="Test name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => { if (name !== item.name) onUpdate(item.id, { name }); }}
        onClick={(e) => e.stopPropagation()}
      />
    </span>
  );
}

function WhereField({ item, onUpdate }: { item: HealthItem; onUpdate: (id: string, u: UpdateFields) => void; }) {
  const [val, setVal] = useState(item.whereAt);
  useEffect(() => { setVal(item.whereAt); }, [item.whereAt]);
  return (
    <label className="health-test-inline-field">
      <span className="health-test-inline-label">Where</span>
      <input
        className="health-test-inline-input"
        value={val}
        placeholder="One Medical, Kaiser, Function Health…"
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== item.whereAt) onUpdate(item.id, { whereAt: val }); }}
      />
    </label>
  );
}

function LinkField({ item, onUpdate }: { item: HealthItem; onUpdate: (id: string, u: UpdateFields) => void; }) {
  const [val, setVal] = useState(item.link);
  useEffect(() => { setVal(item.link); }, [item.link]);
  return (
    <label className="health-test-inline-field">
      <span className="health-test-inline-label">Link</span>
      <input
        className="health-test-inline-input"
        value={val}
        placeholder="https://…"
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== item.link) onUpdate(item.id, { link: val }); }}
      />
    </label>
  );
}

function PriorityChip({ item, onUpdate }: { item: HealthItem; onUpdate: (id: string, u: UpdateFields) => void; }) {
  return (
    <label className="health-test-inline-field">
      <span className="health-test-inline-label">Group</span>
      <select
        className="health-test-inline-input"
        value={item.priority}
        onChange={(e) => onUpdate(item.id, { priority: e.target.value })}
      >
        <option value="">Active</option>
        <option value="low">Later in life</option>
      </select>
    </label>
  );
}

// ── Reusable chip-style popovers ─────────────────────────────────────────────

interface ChipPopoverProps {
  label: string;
  chipClass?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

function ChipPopover({ label, chipClass = '', options, value, onChange }: ChipPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="health-test-chip-wrap" ref={ref}>
      <button
        type="button"
        className={`health-test-chip ${chipClass}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="health-chip-popover">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`health-chip-popover-option ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MonthChipProps {
  months: Set<number>;
  label: string | null;
  onChange: (next: Set<number>) => void;
}

function MonthChip({ months, label, onChange }: MonthChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!label && !open) {
    // No months yet — render a small placeholder chip that opens the picker
    return (
      <div className="health-test-chip-wrap" ref={ref}>
        <button
          type="button"
          className="health-test-chip tone-neutral"
          onClick={() => setOpen(true)}
        >
          Pick months
        </button>
      </div>
    );
  }

  const toggle = (m: number) => {
    const next = new Set(months);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(next);
  };

  return (
    <div className="health-test-chip-wrap" ref={ref}>
      <button
        type="button"
        className="health-test-chip tone-months"
        onClick={() => setOpen((v) => !v)}
      >
        {label || 'Pick months'}
      </button>
      {open && (
        <div className="health-chip-popover health-month-popover-inline">
          <div className="health-month-grid">
            {MONTH_LABELS.map((m, idx) => {
              const num = idx + 1;
              const on = months.has(num);
              return (
                <button
                  key={num}
                  type="button"
                  className={`health-month-option ${on ? 'on' : ''}`}
                  onClick={() => toggle(num)}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History modal ────────────────────────────────────────────────────────────

function HistoryModal({ item, onClose, onChange }: { item: HealthItem; onClose: () => void; onChange: (dates: string[]) => void; }) {
  const dates = (item.value || '').split(',').map((s) => s.trim()).filter(Boolean).sort((a, b) => b.localeCompare(a));
  const [draft, setDraft] = useState(() => new Date().toISOString().slice(0, 10));

  const remove = (d: string) => onChange(dates.filter((x) => x !== d));
  const add = () => {
    if (!draft || dates.includes(draft)) return;
    onChange([...dates, draft]);
  };

  return (
    <div className="health-modal-overlay" onClick={onClose}>
      <div className="health-modal" onClick={(e) => e.stopPropagation()}>
        <div className="health-modal-header">
          <h3>{item.emoji || '🧪'} {item.name || 'Untitled'} — History</h3>
          <button className="health-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="health-modal-body">
          <div className="health-history">
            {dates.length === 0 && (
              <span className="health-history-empty">No past entries yet.</span>
            )}
            {dates.map((d) => (
              <span key={d} className="health-history-chip">
                {formatHistoryDate(d)}
                <button
                  type="button"
                  className="health-history-remove"
                  onClick={() => remove(d)}
                  title="Remove"
                >×</button>
              </span>
            ))}
          </div>
          <div className="health-history-add-row">
            <input
              type="date"
              className="health-history-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="button" className="health-history-confirm" onClick={add}>+ Add date</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHistoryDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTH_LABELS[m - 1]} ${d}, ${y}`;
}
