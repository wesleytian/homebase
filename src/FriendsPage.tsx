import { useState, useEffect } from 'react';
import { Friend, FriendTier } from './types';

interface Props {
  friends: Friend[];
  onBack: () => void;
  onAddFriend: (name: string, tier: FriendTier) => void;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
}

export function FriendsPage({
  friends,
  onBack,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState<'close' | 'friends'>('close');

  const closeFriends = friends.filter(f => f.tier === 1);
  const regularFriends = friends.filter(f => f.tier !== 1);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddFriend(newName.trim(), addingTo === 'close' ? 1 : 2);
      setNewName('');
      setShowAddModal(false);
    }
  };

  const openAddModal = (type: 'close' | 'friends') => {
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

  const moveFriend = (friend: Friend, toClose: boolean) => {
    onEditFriend(friend.id, { tier: toClose ? 1 : 2 });
  };

  return (
    <div className="friends-page-simple">
      <div className="friends-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Friends</h1>
      </div>

      <div className="friends-lists">
        <div className="friends-list-section">
          <div className="friends-list-header">
            <h2>Close Friends</h2>
            <button className="add-pill-btn" onClick={() => openAddModal('close')}>+</button>
          </div>
          <div className="friends-pills">
            {closeFriends.length === 0 ? (
              <span className="empty-pill">No close friends yet</span>
            ) : (
              closeFriends.map(friend => (
                <div key={friend.id} className="friend-pill close">
                  <span className="friend-pill-name">{friend.name}</span>
                  <button
                    className="friend-pill-move"
                    onClick={() => moveFriend(friend, false)}
                    title="Move to Friends"
                  >↓</button>
                  <button
                    className="friend-pill-delete"
                    onClick={() => onDeleteFriend(friend.id)}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="friends-list-section">
          <div className="friends-list-header">
            <h2>Friends</h2>
            <button className="add-pill-btn" onClick={() => openAddModal('friends')}>+</button>
          </div>
          <div className="friends-pills">
            {regularFriends.length === 0 ? (
              <span className="empty-pill">No friends yet</span>
            ) : (
              regularFriends.map(friend => (
                <div key={friend.id} className="friend-pill">
                  <span className="friend-pill-name">{friend.name}</span>
                  <button
                    className="friend-pill-move"
                    onClick={() => moveFriend(friend, true)}
                    title="Move to Close Friends"
                  >↑</button>
                  <button
                    className="friend-pill-delete"
                    onClick={() => onDeleteFriend(friend.id)}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="add-friend-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-friend-modal" onClick={e => e.stopPropagation()}>
            <h3>Add {addingTo === 'close' ? 'Close Friend' : 'Friend'}</h3>
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
