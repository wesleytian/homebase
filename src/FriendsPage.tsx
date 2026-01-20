import { useState, useEffect } from 'react';
import { Friend, FriendTier } from './types';

export type SectionType = 'close' | 'friends' | 'nofollow';

export interface SectionNames {
  close: string;
  friends: string;
  nofollow: string;
}

interface Props {
  friends: Friend[];
  sectionNames: SectionNames;
  onBack: () => void;
  onAddFriend: (name: string, tier: FriendTier) => void;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
  onSectionNameChange: (section: SectionType, name: string) => void;
}

export function FriendsPage({
  friends,
  sectionNames,
  onBack,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
  onSectionNameChange,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState<SectionType>('close');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingSectionTitle, setEditingSectionTitle] = useState<SectionType | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  const closeFriends = friends.filter(f => f.tier === 1);
  const regularFriends = friends.filter(f => f.tier === 2);
  const noFollowFriends = friends.filter(f => f.tier === 3 || f.tier === 4);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const tier: FriendTier = addingTo === 'close' ? 1 : addingTo === 'friends' ? 2 : 3;
      onAddFriend(newName.trim(), tier);
      setNewName('');
      setShowAddModal(false);
    }
  };

  const openAddModal = (type: SectionType) => {
    setAddingTo(type);
    setShowAddModal(true);
  };

  useEffect(() => {
    if (showAddModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowAddModal(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showAddModal]);

  const moveFriend = (friend: Friend, targetTier: FriendTier) => {
    onEditFriend(friend.id, { tier: targetTier });
  };

  const startEditing = (friend: Friend) => {
    setEditingId(friend.id);
    setEditName(friend.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onEditFriend(editingId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditName('');
    }
  };

  const renderFriendPill = (friend: Friend, section: SectionType) => {
    const isEditing = editingId === friend.id;

    return (
      <div key={friend.id} className={`friend-pill ${section === 'close' ? 'close' : ''}`}>
        {isEditing ? (
          <input
            type="text"
            className="friend-pill-edit"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleEditKeyDown}
            autoFocus
          />
        ) : (
          <span className="friend-pill-name" onClick={() => startEditing(friend)}>
            {friend.name}
          </span>
        )}
        <div className="friend-pill-actions">
          {section === 'close' && (
            <button
              className="friend-pill-move"
              onClick={() => moveFriend(friend, 2)}
              title="Move to Friends"
            >↓</button>
          )}
          {section === 'friends' && (
            <>
              <button
                className="friend-pill-move"
                onClick={() => moveFriend(friend, 1)}
                title="Move to Close Friends"
              >↑</button>
              <button
                className="friend-pill-move"
                onClick={() => moveFriend(friend, 3)}
                title="Move to No Follow Up"
              >↓</button>
            </>
          )}
          {section === 'nofollow' && (
            <button
              className="friend-pill-move"
              onClick={() => moveFriend(friend, 2)}
              title="Move to Friends"
            >↑</button>
          )}
          <button
            className="friend-pill-delete"
            onClick={() => onDeleteFriend(friend.id)}
          >×</button>
        </div>
      </div>
    );
  };

  const getSectionTitle = (section: SectionType) => {
    return sectionNames[section];
  };

  const startEditingSectionTitle = (section: SectionType) => {
    setEditingSectionTitle(section);
    setEditSectionName(sectionNames[section]);
  };

  const saveSectionTitle = () => {
    if (editingSectionTitle && editSectionName.trim()) {
      onSectionNameChange(editingSectionTitle, editSectionName.trim());
    }
    setEditingSectionTitle(null);
    setEditSectionName('');
  };

  const handleSectionTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveSectionTitle();
    } else if (e.key === 'Escape') {
      setEditingSectionTitle(null);
      setEditSectionName('');
    }
  };

  const renderSectionTitle = (section: SectionType) => {
    if (editingSectionTitle === section) {
      return (
        <input
          type="text"
          className="section-title-edit"
          value={editSectionName}
          onChange={(e) => setEditSectionName(e.target.value)}
          onBlur={saveSectionTitle}
          onKeyDown={handleSectionTitleKeyDown}
          autoFocus
        />
      );
    }
    return (
      <h2 onClick={() => startEditingSectionTitle(section)} style={{ cursor: 'pointer' }}>
        {getSectionTitle(section)}
      </h2>
    );
  };

  return (
    <div className="friends-page-simple">
      <div className="friends-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Friends</h1>
      </div>

      <div className="friends-lists">
        {/* Close Friends */}
        <div className="friends-list-section">
          <div className="friends-list-header">
            {renderSectionTitle('close')}
            <button className="add-pill-btn" onClick={() => openAddModal('close')}>+</button>
          </div>
          <div className="friends-pills">
            {closeFriends.length === 0 ? (
              <span className="empty-pill">No close friends yet</span>
            ) : (
              closeFriends.map(friend => renderFriendPill(friend, 'close'))
            )}
          </div>
        </div>

        {/* Friends */}
        <div className="friends-list-section">
          <div className="friends-list-header">
            {renderSectionTitle('friends')}
            <button className="add-pill-btn" onClick={() => openAddModal('friends')}>+</button>
          </div>
          <div className="friends-pills">
            {regularFriends.length === 0 ? (
              <span className="empty-pill">No friends yet</span>
            ) : (
              regularFriends.map(friend => renderFriendPill(friend, 'friends'))
            )}
          </div>
        </div>

        {/* No Follow Up */}
        <div className="friends-list-section no-follow">
          <div className="friends-list-header">
            {renderSectionTitle('nofollow')}
            <button className="add-pill-btn" onClick={() => openAddModal('nofollow')}>+</button>
          </div>
          <div className="friends-pills">
            {noFollowFriends.length === 0 ? (
              <span className="empty-pill">No one here yet</span>
            ) : (
              noFollowFriends.map(friend => renderFriendPill(friend, 'nofollow'))
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="add-friend-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-friend-modal" onClick={e => e.stopPropagation()}>
            <h3>Add to {getSectionTitle(addingTo)}</h3>
            <form onSubmit={handleAdd}>
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
    </div>
  );
}
