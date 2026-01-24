import { useState, useEffect, useRef } from 'react';
import { Friend, FriendTier } from './types';
import { UndoAction } from './useUndo';

export interface FriendSection {
  id: string;
  name: string;
  tier: number; // Maps to FriendTier for storage
}

export const DEFAULT_SECTIONS: FriendSection[] = [
  { id: 'close', name: 'Close Friends', tier: 1 },
  { id: 'friends', name: 'Friends', tier: 2 },
  { id: 'nofollow', name: 'No Follow Up', tier: 3 },
];

interface Props {
  friends: Friend[];
  sections: FriendSection[];
  onBack: () => void;
  onAddFriend: (name: string, tier: FriendTier) => Promise<Friend | void>;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
  onSectionsChange: (sections: FriendSection[]) => void;
  pushUndo?: (action: UndoAction) => void;
}

type DragType = 'friend' | 'section' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  // For friend drags: which section to drop into
  targetSectionId: string | null;
  // For section drags: which index to insert at (0 = before first, 1 = after first, etc.)
  dropIndex: number | null;
}

export function FriendsPage({
  friends,
  sections,
  onBack,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
  onSectionsChange,
  pushUndo,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingToSectionId, setAddingToSectionId] = useState<string>('close');
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
  const [editFriendName, setEditFriendName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    draggedId: null,
    targetSectionId: null,
    dropIndex: null,
  });
  const dragRef = useRef<{ type: DragType; id: string } | null>(null);

  const getFriendsInSection = (section: FriendSection) => {
    return friends.filter(f => f.tier === section.tier);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const section = sections.find(s => s.id === addingToSectionId);
      const tier = (section?.tier || 1) as FriendTier;
      const name = newName.trim();
      const result = await onAddFriend(name, tier);

      // Push undo action if we got a friend back and have pushUndo
      if (pushUndo && result && 'id' in result) {
        const friendId = result.id;
        pushUndo({
          type: 'add-friend',
          description: `Add friend "${name}"`,
          undo: () => onDeleteFriend(friendId),
        });
      }

      setNewName('');
      setShowAddModal(false);
    }
  };

  const openAddFriendModal = (sectionId: string) => {
    setAddingToSectionId(sectionId);
    setShowAddModal(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close modals first, then editing states, then go back
        if (showAddModal) {
          setShowAddModal(false);
        } else if (showAddSectionModal) {
          setShowAddSectionModal(false);
        } else if (editingFriendId) {
          setEditingFriendId(null);
          setEditFriendName('');
        } else if (editingSectionId) {
          setEditingSectionId(null);
          setEditSectionName('');
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showAddSectionModal, editingFriendId, editingSectionId, onBack]);

  // Friend drag handlers
  const handleFriendDragStart = (e: React.DragEvent, friendId: string) => {
    dragRef.current = { type: 'friend', id: friendId };
    setDragState({ type: 'friend', draggedId: friendId, targetSectionId: null, dropIndex: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  // When dragging a friend over a section (to move friend between sections)
  const handleFriendDropZoneDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current?.type === 'friend') {
      setDragState(s => ({ ...s, targetSectionId: sectionId }));
    }
  };

  const handleFriendDropZoneDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (dragRef.current?.type === 'friend') {
      const friend = friends.find(f => f.id === dragRef.current!.id);
      const targetSection = sections.find(s => s.id === sectionId);
      if (friend && targetSection && friend.tier !== targetSection.tier) {
        onEditFriend(friend.id, { tier: targetSection.tier as FriendTier });
      }
    }
    resetDragState();
  };

  // Section drag handlers - simplified with explicit drop zones
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    dragRef.current = { type: 'section', id: sectionId };
    setDragState({ type: 'section', draggedId: sectionId, targetSectionId: null, dropIndex: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drop zone between sections - dropIndex is where the section will be inserted
  const handleSectionDropZoneDragOver = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragRef.current?.type === 'section') {
      setDragState(s => ({ ...s, dropIndex }));
    }
  };

  const handleSectionDropZoneDragLeave = () => {
    if (dragRef.current?.type === 'section') {
      setDragState(s => ({ ...s, dropIndex: null }));
    }
  };

  const handleSectionDropZoneDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragRef.current?.type === 'section') {
      const draggedIdx = sections.findIndex(s => s.id === dragRef.current!.id);
      if (draggedIdx === -1) {
        resetDragState();
        return;
      }

      // Calculate the actual insert position
      // If dragging from before the drop zone, the effective index shifts down by 1
      const effectiveDropIndex = draggedIdx < dropIndex ? dropIndex - 1 : dropIndex;

      if (effectiveDropIndex === draggedIdx) {
        // No change needed
        resetDragState();
        return;
      }

      const newSections = [...sections];
      const [dragged] = newSections.splice(draggedIdx, 1);
      newSections.splice(effectiveDropIndex, 0, dragged);

      // Reassign tiers based on new order
      const updatedSections = newSections.map((s, idx) => ({ ...s, tier: idx + 1 }));

      // Update friends with new tiers
      const tierMapping: Record<number, number> = {};
      sections.forEach((oldSection) => {
        const newIdx = updatedSections.findIndex(s => s.id === oldSection.id);
        tierMapping[oldSection.tier] = updatedSections[newIdx].tier;
      });

      friends.forEach(friend => {
        const newTier = tierMapping[friend.tier];
        if (newTier !== friend.tier) {
          onEditFriend(friend.id, { tier: newTier as FriendTier });
        }
      });

      onSectionsChange(updatedSections);
    }
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDragState({ type: null, draggedId: null, targetSectionId: null, dropIndex: null });
    dragRef.current = null;
  };

  // Check if a drop zone should be shown (not adjacent to the dragged section)
  const shouldShowDropZone = (dropIndex: number): boolean => {
    // Check both state and ref (ref is synchronous, state might be delayed)
    const isDraggingSection = dragState.type === 'section' || dragRef.current?.type === 'section';
    const draggedId = dragState.draggedId || dragRef.current?.id;
    if (!isDraggingSection || !draggedId) return false;
    const draggedIdx = sections.findIndex(s => s.id === draggedId);
    // Don't show drop zone right before or right after the dragged item (it would result in no change)
    return dropIndex !== draggedIdx && dropIndex !== draggedIdx + 1;
  };

  const moveFriend = (friend: Friend, direction: 'up' | 'down') => {
    const currentIdx = sections.findIndex(s => s.tier === friend.tier);
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx >= 0 && targetIdx < sections.length) {
      const oldTier = friend.tier;
      const newTier = sections[targetIdx].tier as FriendTier;
      onEditFriend(friend.id, { tier: newTier });

      if (pushUndo) {
        pushUndo({
          type: 'move-friend',
          description: `Move "${friend.name}" ${direction}`,
          undo: () => onEditFriend(friend.id, { tier: oldTier }),
        });
      }
    }
  };

  const startEditingFriend = (friend: Friend) => {
    setEditingFriendId(friend.id);
    setEditFriendName(friend.name);
  };

  const saveEditFriend = () => {
    if (editingFriendId && editFriendName.trim()) {
      onEditFriend(editingFriendId, { name: editFriendName.trim() });
    }
    setEditingFriendId(null);
    setEditFriendName('');
  };

  const handleEditFriendKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditFriend();
    } else if (e.key === 'Escape') {
      setEditingFriendId(null);
      setEditFriendName('');
    }
  };

  const startEditingSection = (section: FriendSection) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
  };

  const saveEditSection = () => {
    if (editingSectionId && editSectionName.trim()) {
      const updated = sections.map(s =>
        s.id === editingSectionId ? { ...s, name: editSectionName.trim() } : s
      );
      onSectionsChange(updated);
    }
    setEditingSectionId(null);
    setEditSectionName('');
  };

  const handleEditSectionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditSection();
    } else if (e.key === 'Escape') {
      setEditingSectionId(null);
      setEditSectionName('');
    }
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectionName.trim()) {
      // Find a tier that no section AND no friend currently uses
      const usedTiers = new Set([
        ...sections.map(s => s.tier),
        ...friends.map(f => f.tier),
      ]);
      let newTier = 1;
      while (usedTiers.has(newTier)) {
        newTier++;
      }
      const newSection: FriendSection = {
        id: `section-${Date.now()}`,
        name: newSectionName.trim(),
        tier: newTier,
      };
      onSectionsChange([...sections, newSection]);
      setNewSectionName('');
      setShowAddSectionModal(false);
    }
  };

  const deleteSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Move friends from deleted section to the previous section (or first if none)
    const sectionIdx = sections.findIndex(s => s.id === sectionId);
    const targetSection = sections[sectionIdx - 1] || sections[sectionIdx + 1];

    if (targetSection) {
      const friendsInSection = getFriendsInSection(section);
      friendsInSection.forEach(friend => {
        onEditFriend(friend.id, { tier: targetSection.tier as FriendTier });
      });
    }

    onSectionsChange(sections.filter(s => s.id !== sectionId));
  };

  const renderFriendPill = (friend: Friend, sectionIdx: number) => {
    const isEditing = editingFriendId === friend.id;
    const isFirstSection = sectionIdx === 0;
    const isLastSection = sectionIdx === sections.length - 1;
    const isDragging = dragState.draggedId === friend.id && dragState.type === 'friend';

    return (
      <div
        key={friend.id}
        className={`friend-pill ${sectionIdx === 0 ? 'close' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable={!isEditing}
        onDragStart={(e) => handleFriendDragStart(e, friend.id)}
        onDragEnd={handleDragEnd}
      >
        <span className="friend-drag-handle">⋮⋮</span>
        {isEditing ? (
          <input
            type="text"
            className="friend-pill-edit"
            value={editFriendName}
            onChange={(e) => setEditFriendName(e.target.value)}
            onBlur={saveEditFriend}
            onKeyDown={handleEditFriendKeyDown}
            autoFocus
          />
        ) : (
          <span className="friend-pill-name" onClick={() => startEditingFriend(friend)}>
            {friend.name}
          </span>
        )}
        <div className="friend-pill-actions">
          {!isFirstSection && (
            <button
              className="friend-pill-move"
              onClick={() => moveFriend(friend, 'up')}
              title={`Move to ${sections[sectionIdx - 1]?.name}`}
            >↑</button>
          )}
          {!isLastSection && (
            <button
              className="friend-pill-move"
              onClick={() => moveFriend(friend, 'down')}
              title={`Move to ${sections[sectionIdx + 1]?.name}`}
            >↓</button>
          )}
        </div>
      </div>
    );
  };

  const renderSectionTitle = (section: FriendSection) => {
    if (editingSectionId === section.id) {
      return (
        <input
          type="text"
          className="section-title-edit"
          value={editSectionName}
          onChange={(e) => setEditSectionName(e.target.value)}
          onBlur={saveEditSection}
          onKeyDown={handleEditSectionKeyDown}
          autoFocus
        />
      );
    }
    return (
      <h2 onClick={() => startEditingSection(section)} style={{ cursor: 'pointer' }}>
        {section.name}
      </h2>
    );
  };

  const getSectionTitle = (sectionId: string) => {
    return sections.find(s => s.id === sectionId)?.name || 'Section';
  };

  return (
    <div className="friends-page-simple">
      <div className="friends-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Friends</h1>
        <button className="add-section-btn" onClick={() => setShowAddSectionModal(true)}>+ Section</button>
      </div>

      <div className="friends-lists">
        {sections.map((section, idx) => {
          const sectionFriends = getFriendsInSection(section);
          const isFriendDropTarget = dragState.targetSectionId === section.id && dragState.type === 'friend';
          const isSectionDragging = dragState.draggedId === section.id && dragState.type === 'section';

          // Determine if this drop zone should be visible
          const showDropZoneBefore = shouldShowDropZone(idx);

          return (
            <div key={section.id}>
              {/* Drop zone BEFORE this section (for section reordering) - always rendered, visibility controlled by CSS */}
              <div
                className={`section-drop-zone ${showDropZoneBefore ? 'visible' : ''} ${dragState.dropIndex === idx ? 'active' : ''}`}
                onDragOver={(e) => handleSectionDropZoneDragOver(e, idx)}
                onDragLeave={handleSectionDropZoneDragLeave}
                onDrop={(e) => handleSectionDropZoneDrop(e, idx)}
              />

              <div
                className={`friends-list-section ${idx === sections.length - 1 ? 'no-follow' : ''} ${isFriendDropTarget ? 'drop-target' : ''} ${isSectionDragging ? 'dragging' : ''}`}
                onDragOver={(e) => handleFriendDropZoneDragOver(e, section.id)}
                onDrop={(e) => handleFriendDropZoneDrop(e, section.id)}
                onDragLeave={() => setDragState(s => ({ ...s, targetSectionId: null }))}
              >
                <div
                  className="friends-list-header"
                  draggable
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="section-drag-handle">⋮⋮</span>
                  {renderSectionTitle(section)}
                  <div className="section-actions">
                    <button className="add-pill-btn" onClick={() => openAddFriendModal(section.id)}>+</button>
                    {sections.length > 1 && (
                      <button
                        className="delete-section-btn"
                        onClick={() => deleteSection(section.id)}
                        title="Delete section"
                      >×</button>
                    )}
                  </div>
                </div>
                <div className="friends-pills">
                  {sectionFriends.length === 0 ? (
                    <span className="empty-pill">No one here yet</span>
                  ) : (
                    sectionFriends.map(friend => renderFriendPill(friend, idx))
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Drop zone AFTER the last section (for section reordering) */}
        <div
          className={`section-drop-zone ${shouldShowDropZone(sections.length) ? 'visible' : ''} ${dragState.dropIndex === sections.length ? 'active' : ''}`}
          onDragOver={(e) => handleSectionDropZoneDragOver(e, sections.length)}
          onDragLeave={handleSectionDropZoneDragLeave}
          onDrop={(e) => handleSectionDropZoneDrop(e, sections.length)}
        />
      </div>

      {showAddModal && (
        <div className="add-friend-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-friend-modal" onClick={e => e.stopPropagation()}>
            <h3>Add to {getSectionTitle(addingToSectionId)}</h3>
            <form onSubmit={handleAddFriend}>
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="add-friend-modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={!newName.trim()}>Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSectionModal && (
        <div className="add-friend-modal-overlay" onClick={() => setShowAddSectionModal(false)}>
          <div className="add-friend-modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Section</h3>
            <form onSubmit={handleAddSection}>
              <input
                type="text"
                placeholder="Section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                autoFocus
              />
              <div className="add-friend-modal-actions">
                <button type="button" onClick={() => setShowAddSectionModal(false)}>Cancel</button>
                <button type="submit" disabled={!newSectionName.trim()}>Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
