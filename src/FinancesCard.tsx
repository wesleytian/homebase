import { useState, useEffect, useRef } from 'react';

interface Props {
  content: string;
  onSave: (content: string) => void;
  isReviewTime: boolean;
}

export function FinancesCard({ content, onSave, isReviewTime }: Props) {
  const [value, setValue] = useState(content);
  const [isCollapsed, setIsCollapsed] = useState(!isReviewTime);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Only sync from props when not focused (to avoid cursor jumping while typing)
  useEffect(() => {
    if (!isFocused) {
      setValue(content);
    }
  }, [content, isFocused]);

  useEffect(() => {
    // Auto-expand on first weekend of month
    if (isReviewTime) {
      setIsCollapsed(false);
    }
  }, [isReviewTime]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      onSave(newValue);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  // Auto-resize on mount
  useEffect(() => {
    if (textareaRef.current && !isCollapsed) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isCollapsed]);

  return (
    <div className={`finances-card ${isReviewTime ? 'review-time' : ''}`}>
      <div className="finances-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="finances-header-left">
          <span className={`section-arrow ${isCollapsed ? '' : 'open'}`}>▶</span>
          <span className="finances-title">Finances</span>
          {isReviewTime && <span className="finances-badge">Review Time</span>}
        </div>
        {saveStatus !== 'idle' && (
          <span className={`finances-save-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <div className="finances-content">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Track your finances, budget notes, investment updates..."
            className="finances-textarea"
          />
          {isReviewTime && (
            <p className="finances-reminder">
              First weekend of the month - time to review your finances!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
