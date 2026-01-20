import { Friend, FRIEND_TIER_LABELS, FriendTier } from './types';

interface Props {
  friends: Friend[];
  onViewAll: () => void;
}

export function FriendsCard({ friends, onViewAll }: Props) {
  const tierCounts = friends.reduce((acc, f) => {
    acc[f.tier] = (acc[f.tier] || 0) + 1;
    return acc;
  }, {} as Record<FriendTier, number>);

  const recentlyContacted = friends
    .filter(f => f.lastContact && Date.now() - f.lastContact < 7 * 24 * 60 * 60 * 1000)
    .length;

  const needsAttention = friends
    .filter(f => {
      if (!f.lastContact) return true;
      const daysSince = (Date.now() - f.lastContact) / (1000 * 60 * 60 * 24);
      // Inner circle: 7 days, Close: 14 days, Friends: 30 days, Acquaintances: 60 days
      const thresholds: Record<FriendTier, number> = { 1: 7, 2: 14, 3: 30, 4: 60 };
      return daysSince > thresholds[f.tier];
    })
    .slice(0, 3);

  return (
    <div className="friends-card">
      <div className="friends-card-header">
        <div className="friends-card-title">
          <span className="friends-icon">👥</span>
          <span>Close Friends</span>
        </div>
        <button className="friends-view-all" onClick={onViewAll}>
          View All
        </button>
      </div>

      <div className="friends-card-content" onClick={onViewAll}>
        {friends.length === 0 ? (
          <div className="friends-empty">Click to add your close friends...</div>
        ) : (
          <>
            <div className="friends-tier-summary">
              {([1, 2, 3, 4] as FriendTier[]).map(tier => (
                tierCounts[tier] ? (
                  <span key={tier} className={`tier-badge tier-${tier}`}>
                    {tierCounts[tier]} {FRIEND_TIER_LABELS[tier]}
                  </span>
                ) : null
              ))}
            </div>

            {needsAttention.length > 0 && (
              <div className="friends-attention">
                <span className="attention-label">Reach out to:</span>
                {needsAttention.map(f => (
                  <span key={f.id} className="attention-name">{f.name}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="friends-card-footer">
        <span className="friends-stat">
          {friends.length} friends
        </span>
        <span className="friends-stat">
          {recentlyContacted} contacted this week
        </span>
      </div>
    </div>
  );
}
