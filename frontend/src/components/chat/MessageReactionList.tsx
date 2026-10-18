import React from 'react';
import { SmilePlus } from 'lucide-react';
import type { MessageReaction } from './reactionManager';

interface ReactionListProps {
  messageId: number;
  reactions: MessageReaction[];
  currentUserName: string;
  onToggleReaction: (emoji: string) => void;
  onOpenPicker?: () => void;
}

export const MessageReactionList: React.FC<ReactionListProps> = ({
  reactions,
  currentUserName,
  onToggleReaction,
  onOpenPicker
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  const normalizedUser = (currentUserName || 'Tôi').trim();

  return (
    <div className="discord-reactions-row" onClick={(e) => e.stopPropagation()}>
      {reactions.map((r) => {
        const hasReacted = r.users.includes(normalizedUser);
        const usersTooltip = r.users.length > 0 
          ? `${r.users.join(', ')} đã thả biểu cảm`
          : undefined;

        return (
          <button
            key={r.emoji}
            type="button"
            className={`discord-reaction-pill ${hasReacted ? 'reacted' : ''}`}
            title={usersTooltip}
            onClick={() => onToggleReaction(r.emoji)}
          >
            <span className="discord-reaction-emoji">{r.emoji}</span>
            <span className="discord-reaction-count">{r.count}</span>
          </button>
        );
      })}

      {onOpenPicker && (
        <button
          type="button"
          className="discord-reaction-add-btn"
          title="Thêm biểu cảm"
          onClick={onOpenPicker}
        >
          <SmilePlus size={14} />
        </button>
      )}
    </div>
  );
};
