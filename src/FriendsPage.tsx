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
type DropPosition = 'above' | 'below' | null;

interface DragState {
  type: DragType;
  draggedId: string | null;
  targetSectionId: string | null;
  position: DropPosition;
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
    position: null,
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
    setDragState({ type: 'friend', draggedId: friendId, targetSectionId: null, position: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (dragRef.current?.type === 'friend') {
      setDragState(s => ({ ...s, targetSectionId: sectionId }));
    }
  };

  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
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

  // Section drag handlers
  const handleSectionHeaderDragStart = (e: React.DragEvent, sectionId: string) => {
    dragRef.current = { type: 'section', id: sectionId };
    setDragState({ type: 'section', draggedId: sectionId, targetSectionId: null, position: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionHeaderDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (dragRef.current?.type === 'section' && dragRef.current.id !== sectionId) {
      // Determine above or below based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position: DropPosition = e.clientY < midY ? 'above' : 'below';
      setDragState(s => ({ ...s, targetSectionId: sectionId, position }));
    }
  };

  const handleSectionHeaderDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();

    if (dragRef.current?.type === 'section' && dragRef.current.id !== targetSectionId) {
      const draggedIdx = sections.findIndex(s => s.id === dragRef.current!.id);
      const targetIdx = sections.findIndex(s => s.id === targetSectionId);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const newSections = [...sections];
        const [dragged] = newSections.splice(draggedIdx, 1);

        // Insert at correct position based on drop position
        let insertIdx = targetIdx;
        if (dragState.position === 'below') {
          insertIdx = draggedIdx < targetIdx ? targetIdx : targetIdx + 1;
        } else {
          insertIdx = draggedIdx < targetIdx ? targetIdx - 1 : targetIdx;
        }
        newSections.splice(insertIdx, 0, dragged);

        // Reassign tiers based on new order
        const updatedSections = newSections.map((s, idx) => ({ ...s, tier: idx + 1 }));

        // Update friends with new tiers
        const tierMapping: Record<number, number> = {};
        sections.forEach((oldSection) => {
          const newIdx = updatedSections.findIndex(s => s.id === oldSection.id);
          tierMapping[oldSection.tier] = updatedSections[newIdx].tier;
        });

        // Update all friends with new tiers
        friends.forEach(friend => {
          const newTier = tierMapping[friend.tier];
          if (newTier !== friend.tier) {
            onEditFriend(friend.id, { tier: newTier as FriendTier });
          }
        });

        onSectionsChange(updatedSections);
      }
    }

    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDragState({ type: null, draggedId: null, targetSectionId: null, position: null });
    dragRef.current = null;
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

  const handleDeleteFriend = (friend: Friend) => {
    onDeleteFriend(friend.id);

    if (pushUndo) {
      pushUndo({
        type: 'delete-friend',
        description: `Delete "${friend.name}"`,
        undo: () => onAddFriend(friend.name, friend.tier),
      });
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
          <button
            className="friend-pill-delete"
            onClick={() => handleDeleteFriend(friend)}
          >×</button>
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
          const isDropTarget = dragState.targetSectionId === section.id && dragState.type === 'friend';
          const isSectionDragging = dragState.draggedId === section.id && dragState.type === 'section';
          const isSectionDropTarget = dragState.targetSectionId === section.id && dragState.type === 'section';

          const sectionDropClass = isSectionDropTarget && dragState.position ? `section-drop-${dragState.position}` : '';

          return (
            <div
              key={section.id}
              className={`friends-list-section ${idx === sections.length - 1 ? 'no-follow' : ''} ${isDropTarget ? 'drop-target' : ''} ${isSectionDragging ? 'dragging' : ''} ${sectionDropClass}`}
              onDragOver={(e) => handleSectionDragOver(e, section.id)}
              onDrop={(e) => handleSectionDrop(e, section.id)}
              onDragLeave={() => setDragState(s => ({ ...s, targetSectionId: null, position: null }))}
            >
              <div
                className="friends-list-header"
                draggable
                onDragStart={(e) => handleSectionHeaderDragStart(e, section.id)}
                onDragOver={(e) => handleSectionHeaderDragOver(e, section.id)}
                onDrop={(e) => handleSectionHeaderDrop(e, section.id)}
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
          );
        })}
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
