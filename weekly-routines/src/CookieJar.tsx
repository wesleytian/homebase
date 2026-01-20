import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  content: string;
  onSave: (content: string) => void;
}

export function CookieJar({ content, onSave }: Props) {
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(100, textareaRef.current.scrollHeight) + 'px';
    }
  }, [value]);

  const autoSave = useCallback((newValue: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave(newValue);
    }, 500);
  }, [onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    autoSave(newValue);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="cookie-jar">
      <textarea
        ref={textareaRef}
        className="cookie-jar-textarea"
        value={value}
        onChange={handleChange}
        placeholder="Write down your wins, accomplishments, and moments of pride. Come back here when you need a reminder of how far you've come..."
      />
      <div className="cookie-jar-footer">
        <span className="auto-save-indicator">Auto-saving</span>
      </div>
    </div>
  );
}
