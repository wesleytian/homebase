import { useState, useEffect, useRef } from 'react';
import { Friend, FriendTier, FriendSection } from './types';
import { UndoAction } from './useUndo';

interface Props {
  friends: Friend[];
  sections: FriendSection[];
  onBack: () => void;
  onAddFriend: (name: string, tier: FriendTier) => Promise<Friend | void>;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
  onSectionsChange: (sections: FriendSection[]) => void;
  onReorderFriends: (updates: { id: string; tier?: number; order?: number }[]) => Promise<void>;
  pushUndo?: (action: UndoAction) => void;
}

type DragType = 'friend' | 'section' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  targetId: string | null;
  position: 'above' | 'below' | null;
  targetSectionId: string | null;
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
  onReorderFriends,
  pushUndo,
}: Props) {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    draggedId: null,
    targetId: null,
    position: null,
    targetSectionId: null,
    dropIndex: null,
  });
  const dragRef = useRef<{ type: DragType; id: string } | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const pendingFocusRef = useRef<string | null>(null);

  const getFriendsInSection = (section: FriendSection) => {
    return friends.filter(f => f.tier === section.tier).sort((a, b) => a.order - b.order);
  };

  // Focus pending input after render
  useEffect(() => {
    if (pendingFocusRef.current) {
      const input = inputRefs.current.get(pendingFocusRef.current);
      if (input) {
        input.focus();
        pendingFocusRef.current = null;
      }
    }
  });

  // Escape to close modals or go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddSectionModal) {
          setShowAddSectionModal(false);
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
  }, [showAddSectionModal, editingSectionId, onBack]);

  // Get all friends ordered by section then by order
  const getAllFriendsOrdered = () => {
    const result: Friend[] = [];
    for (const section of sections) {
      result.push(...getFriendsInSection(section));
    }
    return result;
  };

  // Add friend inline
  const addFriendToSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const tier = (section?.tier || 1) as FriendTier;
    const result = await onAddFriend('', tier);
    if (result && 'id' in result) {
      pendingFocusRef.current = result.id;
      if (pushUndo) {
        const friendId = result.id;
        pushUndo({
          type: 'add-friend',
          description: 'Add friend',
          undo: () => onDeleteFriend(friendId),
        });
      }
    }
  };

  // Friend row keyboard handling
  const handleFriendKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, friend: Friend, sectionId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = e.currentTarget.value.trim();
      if (!name) return; // Don't create new row if current is empty
      if (name !== friend.name) {
        onEditFriend(friend.id, { name });
      }
      addFriendToSection(sectionId);
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      e.preventDefault();
      // Focus previous friend
      const allFriends = getAllFriendsOrdered();
      const idx = allFriends.findIndex(f => f.id === friend.id);
      if (idx > 0) {
        pendingFocusRef.current = allFriends[idx - 1].id;
      }
      onDeleteFriend(friend.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const allFriends = getAllFriendsOrdered();
      const idx = allFriends.findIndex(f => f.id === friend.id);
      if (idx > 0) {
        inputRefs.current.get(allFriends[idx - 1].id)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const allFriends = getAllFriendsOrdered();
      const idx = allFriends.findIndex(f => f.id === friend.id);
      if (idx < allFriends.length - 1) {
        inputRefs.current.get(allFriends[idx + 1].id)?.focus();
      }
    }
  };

  // Save on blur, delete if empty
  const handleFriendBlur = (friend: Friend, value: string) => {
    const name = value.trim();
    if (name === '' && friend.name === '') {
      onDeleteFriend(friend.id);
    } else if (name && name !== friend.name) {
      onEditFriend(friend.id, { name });
    }
  };

  // --- Friend drag handlers ---
  const handleFriendDragStart = (e: React.DragEvent, friendId: string) => {
    dragRef.current = { type: 'friend', id: friendId };
    setDragState(s => ({ ...s, type: 'friend', draggedId: friendId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFriendDragOver = (e: React.DragEvent, friendId: string) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'friend' || dragRef.current.id === friendId) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDragState(s => ({ ...s, targetId: friendId, position }));
  };

  const handleFriendDragLeave = () => {
    setDragState(s => ({ ...s, targetId: null, position: null }));
  };

  const handleFriendDrop = (e: React.DragEvent, targetFriendId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.type !== 'friend') { resetDragState(); return; }

    const draggedId = dragRef.current.id;
    if (draggedId === targetFriendId) { resetDragState(); return; }

    const draggedFriend = friends.find(f => f.id === draggedId);
    const targetFriend = friends.find(f => f.id === targetFriendId);
    if (!draggedFriend || !targetFriend) { resetDragState(); return; }

    const targetSection = sections.find(s => s.tier === targetFriend.tier);
    if (!targetSection) { resetDragState(); return; }

    const position = dragState.position || 'below';

    // Build new ordered list for target section
    const targetSectionFriends = friends
      .filter(f => f.tier === targetSection.tier && f.id !== draggedId)
      .sort((a, b) => a.order - b.order);

    const targetIdx = targetSectionFriends.findIndex(f => f.id === targetFriendId);
    const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
    targetSectionFriends.splice(insertIdx, 0, draggedFriend);

    const updates: { id: string; tier?: number; order?: number }[] = [];
    targetSectionFriends.forEach((f, idx) => {
      const needsTierUpdate = f.id === draggedId && f.tier !== targetSection.tier;
      const needsOrderUpdate = f.order !== idx;
      if (needsTierUpdate || needsOrderUpdate) {
        updates.push({
          id: f.id,
          ...(needsTierUpdate ? { tier: targetSection.tier } : {}),
          order: idx,
        });
      }
    });

    // If moved across sections, reorder source section too
    if (draggedFriend.tier !== targetSection.tier) {
      const sourceFriends = friends
        .filter(f => f.tier === draggedFriend.tier && f.id !== draggedId)
        .sort((a, b) => a.order - b.order);
      sourceFriends.forEach((f, idx) => {
        if (f.order !== idx) {
          updates.push({ id: f.id, order: idx });
        }
      });
    }

    if (updates.length > 0) {
      onReorderFriends(updates);
      if (pushUndo) {
        const oldTier = draggedFriend.tier;
        const oldOrder = draggedFriend.order;
        pushUndo({
          type: 'move-friend',
          description: `Move "${draggedFriend.name}"`,
          undo: () => onEditFriend(draggedId, { tier: oldTier, order: oldOrder }),
        });
      }
    }

    resetDragState();
  };

  // Drop on empty section body
  const handleSectionBodyDragOver = (e: React.DragEvent, sectionId: string) => {
    if (dragRef.current?.type !== 'friend') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(s => ({ ...s, targetSectionId: sectionId, targetId: null, position: null }));
  };

  const handleSectionBodyDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'friend') { resetDragState(); return; }

    const draggedId = dragRef.current.id;
    const draggedFriend = friends.find(f => f.id === draggedId);
    const targetSection = sections.find(s => s.id === sectionId);
    if (!draggedFriend || !targetSection) { resetDragState(); return; }

    // Move to end of section
    const sectionFriends = friends
      .filter(f => f.tier === targetSection.tier && f.id !== draggedId)
      .sort((a, b) => a.order - b.order);

    const updates: { id: string; tier?: number; order?: number }[] = [
      { id: draggedId, tier: targetSection.tier, order: sectionFriends.length },
    ];

    // Reorder source section if different
    if (draggedFriend.tier !== targetSection.tier) {
      const sourceFriends = friends
        .filter(f => f.tier === draggedFriend.tier && f.id !== draggedId)
        .sort((a, b) => a.order - b.order);
      sourceFriends.forEach((f, idx) => {
        if (f.order !== idx) updates.push({ id: f.id, order: idx });
      });
    }

    if (updates.length > 0) onReorderFriends(updates);
    resetDragState();
  };

  // --- Section drag handlers ---
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    dragRef.current = { type: 'section', id: sectionId };
    setDragState(s => ({ ...s, type: 'section', draggedId: sectionId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => resetDragState();

  const resetDragState = () => {
    setDragState({ type: null, draggedId: null, targetId: null, position: null, targetSectionId: null, dropIndex: null });
    dragRef.current = null;
  };

  // --- Section editing ---
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
    if (e.key === 'Enter') saveEditSection();
    else if (e.key === 'Escape') {
      setEditingSectionId(null);
      setEditSectionName('');
    }
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectionName.trim()) {
      const usedTiers = new Set([...sections.map(s => s.tier), ...friends.map(f => f.tier)]);
      let newTier = 1;
      while (usedTiers.has(newTier)) newTier++;
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

  return (
    <div className="friends-page-simple">
      <div className="friends-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Friends</h1>
        <button className="add-section-btn" onClick={() => setShowAddSectionModal(true)}>+ Section</button>
      </div>

      <div className="friends-lists">
        {sections.map((section) => {
          const sectionFriends = getFriendsInSection(section);
          const isSectionDragging = dragState.draggedId === section.id && dragState.type === 'section';
          const isFriendDropTarget = dragState.targetSectionId === section.id && dragState.type === 'friend';

          return (
            <div
              key={section.id}
              className={`friends-list-section ${isFriendDropTarget ? 'drop-target' : ''} ${isSectionDragging ? 'dragging' : ''}`}
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
                  <button className="add-friend-row-btn" onClick={() => addFriendToSection(section.id)}>+</button>
                  {sections.length > 1 && (
                    <button
                      className="delete-section-btn"
                      onClick={() => deleteSection(section.id)}
                      title="Delete section"
                    >×</button>
                  )}
                </div>
              </div>
              <div
                className="friends-rows"
                onDragOver={(e) => handleSectionBodyDragOver(e, section.id)}
                onDrop={(e) => handleSectionBodyDrop(e, section.id)}
                onDragLeave={() => setDragState(s => ({ ...s, targetSectionId: null }))}
              >
                {sectionFriends.length === 0 ? (
                  <span className="friends-empty">No one here yet</span>
                ) : (
                  sectionFriends.map(friend => {
                    const isDragging = dragState.draggedId === friend.id && dragState.type === 'friend';
                    const isDropTarget = dragState.targetId === friend.id;
                    const dropPos = isDropTarget ? dragState.position : null;

                    return (
                      <div
                        key={friend.id}
                        className={`friend-row ${isDragging ? 'dragging' : ''} ${dropPos ? `drop-${dropPos}` : ''}`}
                        draggable
                        onDragStart={(e) => handleFriendDragStart(e, friend.id)}
                        onDragOver={(e) => handleFriendDragOver(e, friend.id)}
                        onDragLeave={handleFriendDragLeave}
                        onDrop={(e) => handleFriendDrop(e, friend.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className="friend-row-handle">⋮⋮</span>
                        <input
                          ref={(el) => {
                            if (el) inputRefs.current.set(friend.id, el);
                            else inputRefs.current.delete(friend.id);
                          }}
                          type="text"
                          className="friend-row-input"
                          defaultValue={friend.name}
                          placeholder="Name..."
                          onBlur={(e) => handleFriendBlur(friend, e.target.value)}
                          onKeyDown={(e) => handleFriendKeyDown(e, friend, section.id)}
                        />
                        <button className="friend-row-delete" onClick={() => onDeleteFriend(friend.id)}>×</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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
