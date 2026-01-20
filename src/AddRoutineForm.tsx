import { useState } from 'react';

interface Props {
  onAdd: (name: string, frequency: number, metadata: string) => void;
}

export function AddRoutineForm({ onAdd }: Props) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState(3);
  const [metadata, setMetadata] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), frequency, metadata.trim());
    setName('');
    setFrequency(3);
    setMetadata('');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button className="add-routine-btn" onClick={() => setIsExpanded(true)}>
        + Add Routine
      </button>
    );
  }

  return (
    <form className="add-routine-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Routine name (e.g., Cardio)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <div className="frequency-input">
        <label>
          <input
            type="number"
            min="1"
            max="7"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />
          <span>times per week</span>
        </label>
      </div>

      <textarea
        placeholder="Notes/metadata (e.g., 3.6 mph, 40 min)"
        value={metadata}
        onChange={(e) => setMetadata(e.target.value)}
        rows={2}
      />

      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={() => setIsExpanded(false)}>
          Cancel
        </button>
        <button type="submit" className="submit-btn" disabled={!name.trim()}>
          Add Routine
        </button>
      </div>
    </form>
  );
}
