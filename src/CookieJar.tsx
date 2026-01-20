import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  content: string;
  onSave: (content: string) => void;
}

export function CookieJar({ content, onSave }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  // Auto-resize textarea in modal
  useEffect(() => {
    if (showModal && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + 'px';
    }
  }, [value, showModal]);

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

  // Handle Escape key to close modal
  useEffect(() => {
    if (showModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showModal]);

  // Count items (non-empty lines)
  const itemCount = content.split('\n').filter(line => line.trim()).length;

  return (
    <>
      <div className="cookie-jar-card" onClick={() => setShowModal(true)}>
        <div className="cookie-jar-card-content">
          <span className="cookie-jar-icon">🍪</span>
          <div className="cookie-jar-info">
            <span className="cookie-jar-title">Cookie Jar</span>
            <span className="cookie-jar-count">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          </div>
          <button className="cookie-jar-open-btn">Open</button>
        </div>
      </div>

      {showModal && (
        <div className="cookie-jar-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cookie-jar-modal" onClick={e => e.stopPropagation()}>
            <div className="cookie-jar-modal-header">
              <h2>🍪 Cookie Jar</h2>
              <button className="cookie-jar-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <p className="cookie-jar-description">
              Your wins, accomplishments, and moments of pride. Come back here when you need a reminder of how far you've come.
            </p>
            <textarea
              ref={textareaRef}
              className="cookie-jar-textarea"
              value={value}
              onChange={handleChange}
              placeholder="- Shipped the new feature&#10;- Got positive feedback from the client&#10;- Ran my first 5K..."
            />
            <div className="cookie-jar-modal-footer">
              <span className="cookie-jar-count-footer">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              <span className="auto-save-indicator">Auto-saving</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
