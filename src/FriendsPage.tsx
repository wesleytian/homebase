import { useState, useEffect } from 'react';
import { Friend, FriendTier } from './types';

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
  onAddFriend: (name: string, tier: FriendTier) => void;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
  onSectionsChange: (sections: FriendSection[]) => void;
}

export function FriendsPage({
  friends,
  sections,
  onBack,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
  onSectionsChange,
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

  const getFriendsInSection = (section: FriendSection) => {
    return friends.filter(f => f.tier === section.tier);
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const section = sections.find(s => s.id === addingToSectionId);
      const tier = (section?.tier || 1) as FriendTier;
      onAddFriend(newName.trim(), tier);
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
        setShowAddModal(false);
        setShowAddSectionModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const moveFriend = (friend: Friend, direction: 'up' | 'down') => {
    const currentIdx = sections.findIndex(s => s.tier === friend.tier);
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx >= 0 && targetIdx < sections.length) {
      onEditFriend(friend.id, { tier: sections[targetIdx].tier as FriendTier });
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
      const maxTier = Math.max(...sections.map(s => s.tier), 0);
      const newSection: FriendSection = {
        id: `section-${Date.now()}`,
        name: newSectionName.trim(),
        tier: maxTier + 1,
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

    return (
      <div key={friend.id} className={`friend-pill ${sectionIdx === 0 ? 'close' : ''}`}>
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
            onClick={() => onDeleteFriend(friend.id)}
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
          return (
            <div key={section.id} className={`friends-list-section ${idx === sections.length - 1 ? 'no-follow' : ''}`}>
              <div className="friends-list-header">
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
