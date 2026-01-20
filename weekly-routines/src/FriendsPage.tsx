import { useState } from 'react';
import { Friend, FriendConnection, FriendTier, FRIEND_TIER_LABELS } from './types';

interface Props {
  friends: Friend[];
  connections: FriendConnection[];
  onBack: () => void;
  onAddFriend: (name: string, tier: FriendTier) => void;
  onEditFriend: (id: string, updates: Partial<Friend>) => void;
  onDeleteFriend: (id: string) => void;
  onAddConnection: (friendId1: string, friendId2: string) => void;
  onDeleteConnection: (id: string) => void;
}

export function FriendsPage({
  friends,
  connections,
  onBack,
  onAddFriend,
  onEditFriend,
  onDeleteFriend,
  onAddConnection,
  onDeleteConnection,
}: Props) {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState<FriendTier>(3);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  const friendsByTier = friends.reduce((acc, friend) => {
    if (!acc[friend.tier]) acc[friend.tier] = [];
    acc[friend.tier].push(friend);
    return acc;
  }, {} as Record<FriendTier, Friend[]>);

  const getConnectionsFor = (friendId: string) => {
    return connections.filter(c => c.friendId1 === friendId || c.friendId2 === friendId);
  };

  const getConnectedFriends = (friendId: string): Friend[] => {
    const friendConnections = getConnectionsFor(friendId);
    const connectedIds = friendConnections.map(c =>
      c.friendId1 === friendId ? c.friendId2 : c.friendId1
    );
    return friends.filter(f => connectedIds.includes(f.id));
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddFriend(newName.trim(), newTier);
      setNewName('');
      setNewTier(3);
      setShowAddForm(false);
    }
  };

  const handleConnect = (otherFriendId: string) => {
    if (selectedFriend) {
      onAddConnection(selectedFriend.id, otherFriendId);
      setShowConnectModal(false);
    }
  };

  const handleSaveNotes = () => {
    if (selectedFriend) {
      onEditFriend(selectedFriend.id, { notes: notesValue });
      setSelectedFriend({ ...selectedFriend, notes: notesValue });
      setEditingNotes(false);
    }
  };

  const formatLastContact = (timestamp: number | null) => {
    if (!timestamp) return 'Never contacted';
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Contacted today';
    if (days === 1) return 'Contacted yesterday';
    if (days < 7) return `Contacted ${days} days ago`;
    if (days < 30) return `Contacted ${Math.floor(days / 7)} weeks ago`;
    return `Contacted ${Math.floor(days / 30)} months ago`;
  };

  const markContacted = (friend: Friend) => {
    onEditFriend(friend.id, { lastContact: Date.now() });
    if (selectedFriend?.id === friend.id) {
      setSelectedFriend({ ...friend, lastContact: Date.now() });
    }
  };

  const changeTier = (friend: Friend, tier: FriendTier) => {
    onEditFriend(friend.id, { tier });
    if (selectedFriend?.id === friend.id) {
      setSelectedFriend({ ...friend, tier });
    }
  };

  // Friend detail view
  if (selectedFriend) {
    const connectedFriends = getConnectedFriends(selectedFriend.id);
    const friendConnections = getConnectionsFor(selectedFriend.id);
    const unconnectedFriends = friends.filter(
      f => f.id !== selectedFriend.id && !connectedFriends.some(cf => cf.id === f.id)
    );

    return (
      <div className="friends-page">
        <div className="friends-page-header">
          <button className="back-btn" onClick={() => setSelectedFriend(null)}>← Back</button>
          <button
            className="delete-friend-btn"
            onClick={() => {
              if (confirm(`Remove ${selectedFriend.name}?`)) {
                onDeleteFriend(selectedFriend.id);
                setSelectedFriend(null);
              }
            }}
          >
            Delete
          </button>
        </div>

        <div className="friend-detail">
          <div className="friend-detail-header">
            <h1>{selectedFriend.name}</h1>
            <select
              className="tier-select"
              value={selectedFriend.tier}
              onChange={(e) => changeTier(selectedFriend, Number(e.target.value) as FriendTier)}
            >
              {([1, 2, 3, 4] as FriendTier[]).map(tier => (
                <option key={tier} value={tier}>{FRIEND_TIER_LABELS[tier]}</option>
              ))}
            </select>
          </div>

          <div className="friend-contact-status">
            <span className="last-contact">{formatLastContact(selectedFriend.lastContact)}</span>
            <button className="contact-btn" onClick={() => markContacted(selectedFriend)}>
              ✓ Mark Contacted
            </button>
          </div>

          <div className="friend-notes-section">
            <h3>Notes</h3>
            {editingNotes ? (
              <div className="notes-edit">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this friend..."
                  rows={4}
                  autoFocus
                />
                <div className="notes-edit-actions">
                  <button className="cancel-btn" onClick={() => setEditingNotes(false)}>Cancel</button>
                  <button className="save-btn" onClick={handleSaveNotes}>Save</button>
                </div>
              </div>
            ) : (
              <div
                className="notes-display"
                onClick={() => {
                  setNotesValue(selectedFriend.notes);
                  setEditingNotes(true);
                }}
              >
                {selectedFriend.notes || 'Click to add notes...'}
              </div>
            )}
          </div>

          <div className="friend-connections-section">
            <div className="connections-header">
              <h3>Knows ({connectedFriends.length})</h3>
              {unconnectedFriends.length > 0 && (
                <button className="add-connection-btn" onClick={() => setShowConnectModal(true)}>
                  + Add Connection
                </button>
              )}
            </div>

            {connectedFriends.length === 0 ? (
              <p className="no-connections">No connections yet. Add who they know!</p>
            ) : (
              <div className="connections-list">
                {connectedFriends.map(friend => {
                  const connection = friendConnections.find(
                    c => c.friendId1 === friend.id || c.friendId2 === friend.id
                  );
                  return (
                    <div key={friend.id} className="connection-item">
                      <span className={`tier-dot tier-${friend.tier}`} />
                      <span className="connection-name" onClick={() => setSelectedFriend(friend)}>
                        {friend.name}
                      </span>
                      <span className="connection-tier">{FRIEND_TIER_LABELS[friend.tier]}</span>
                      <button
                        className="remove-connection-btn"
                        onClick={() => connection && onDeleteConnection(connection.id)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {showConnectModal && (
          <div className="connect-modal-overlay" onClick={() => setShowConnectModal(false)}>
            <div className="connect-modal" onClick={e => e.stopPropagation()}>
              <h3>Who does {selectedFriend.name} know?</h3>
              <div className="connect-options">
                {unconnectedFriends.map(friend => (
                  <button
                    key={friend.id}
                    className="connect-option"
                    onClick={() => handleConnect(friend.id)}
                  >
                    <span className={`tier-dot tier-${friend.tier}`} />
                    {friend.name}
                  </button>
                ))}
              </div>
              <button className="cancel-btn" onClick={() => setShowConnectModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="friends-page">
      <div className="friends-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Close Friends</h1>
      </div>

      <button className="add-friend-btn" onClick={() => setShowAddForm(true)}>
        + Add Friend
      </button>

      {showAddForm && (
        <form className="add-friend-form-full" onSubmit={handleAddFriend}>
          <input
            type="text"
            placeholder="Friend's name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <select value={newTier} onChange={(e) => setNewTier(Number(e.target.value) as FriendTier)}>
            {([1, 2, 3, 4] as FriendTier[]).map(tier => (
              <option key={tier} value={tier}>{FRIEND_TIER_LABELS[tier]}</option>
            ))}
          </select>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={!newName.trim()}>
              Add
            </button>
          </div>
        </form>
      )}

      {friends.length === 0 ? (
        <div className="empty-state">
          <p>No friends added yet. Start building your network!</p>
        </div>
      ) : (
        <div className="friends-tiers">
          {([1, 2, 3, 4] as FriendTier[]).map(tier => {
            const tierFriends = friendsByTier[tier] || [];
            if (tierFriends.length === 0) return null;

            return (
              <div key={tier} className={`tier-section tier-${tier}`}>
                <h2 className="tier-header">
                  <span className={`tier-dot tier-${tier}`} />
                  {FRIEND_TIER_LABELS[tier]}
                  <span className="tier-count">{tierFriends.length}</span>
                </h2>
                <div className="tier-friends">
                  {tierFriends.map(friend => (
                    <div
                      key={friend.id}
                      className="friend-item"
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <div className="friend-item-main">
                        <span className="friend-item-name">{friend.name}</span>
                        <span className="friend-item-connections">
                          {getConnectionsFor(friend.id).length} connections
                        </span>
                      </div>
                      <div className="friend-item-right">
                        <span className="friend-item-contact">
                          {formatLastContact(friend.lastContact)}
                        </span>
                        <button
                          className="quick-contact-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            markContacted(friend);
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
