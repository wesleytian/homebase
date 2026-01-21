import { useState, useEffect, useRef } from 'react';

interface Props {
  content: string;
  onSave: (content: string) => void;
}

export function QuickNotes({ content, onSave }: Props) {
  const [value, setValue] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setValue(newValue);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    setIsSaving(true);
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave(newValue);
      setIsSaving(false);
    }, 500);
  };

  return (
    <div className="quick-notes">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot down quick thoughts, ideas, or tasks to organize later..."
        className="quick-notes-textarea"
      />
      {isSaving && <span className="quick-notes-saving">Saving...</span>}
    </div>
  );
}
