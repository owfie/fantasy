'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import styles from './FantasyTeamCard.module.scss';

interface FantasyTeamCardProps {
  teamName: string;
  teamEmoji?: string;
  username?: string;
  teamId: string;
  onTeamNameUpdate: (newName: string) => Promise<void>;
  onTeamEmojiUpdate?: (newEmoji: string) => Promise<void>;
  isUpdatingTeamName?: boolean;
}

export function FantasyTeamCard({
  teamName,
  teamEmoji = '🏆',
  username,
  teamId,
  onTeamNameUpdate,
  onTeamEmojiUpdate,
  isUpdatingTeamName = false,
}: FantasyTeamCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [isEditingEmoji, setIsEditingEmoji] = useState(false);
  const [editedEmoji, setEditedEmoji] = useState(teamEmoji);

  // Sync editedName when teamName prop changes
  useEffect(() => {
    if (!isEditingName) {
      setEditedName(teamName);
    }
  }, [teamName, isEditingName]);

  // Sync editedEmoji when teamEmoji prop changes
  useEffect(() => {
    if (!isEditingEmoji) {
      setEditedEmoji(teamEmoji);
    }
  }, [teamEmoji, isEditingEmoji]);

  const handleNameClick = () => {
    if (!isUpdatingTeamName && teamId) {
      setIsEditingName(true);
    }
  };

  const handleNameSave = async () => {
    if (!editedName.trim() || editedName.trim() === teamName) {
      setIsEditingName(false);
      setEditedName(teamName);
      return;
    }

    try {
      await onTeamNameUpdate(editedName.trim());
      setIsEditingName(false);
    } catch (error) {
      setEditedName(teamName);
      setIsEditingName(false);
    }
  };

  const handleNameCancel = () => {
    setEditedName(teamName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleEmojiClick = () => {
    if (onTeamEmojiUpdate && teamId) {
      setIsEditingEmoji(true);
    }
  };

  const handleEmojiSave = async () => {
    if (!editedEmoji.trim() || editedEmoji.trim() === teamEmoji || !onTeamEmojiUpdate) {
      setIsEditingEmoji(false);
      setEditedEmoji(teamEmoji);
      return;
    }

    try {
      await onTeamEmojiUpdate(editedEmoji.trim());
      setIsEditingEmoji(false);
    } catch (error) {
      setEditedEmoji(teamEmoji);
      setIsEditingEmoji(false);
    }
  };

  const handleEmojiCancel = () => {
    setEditedEmoji(teamEmoji);
    setIsEditingEmoji(false);
  };

  const handleEmojiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEmojiSave();
    } else if (e.key === 'Escape') {
      handleEmojiCancel();
    }
  };

  return (
    <Card className={styles.teamCard}>
      <div className={styles.content}>
        <div className={styles.emojiSection}>
          {isEditingEmoji ? (
            <div className={styles.emojiEdit}>
              <input
                type="text"
                value={editedEmoji}
                onChange={(e) => setEditedEmoji(e.target.value)}
                onBlur={handleEmojiSave}
                onKeyDown={handleEmojiKeyDown}
                className={styles.emojiInput}
                autoFocus
                maxLength={2}
              />
            </div>
          ) : (
            <div
              className={styles.emojiDisplay}
              onClick={handleEmojiClick}
              title={onTeamEmojiUpdate ? 'Click to edit emoji' : ''}
            >
              {teamEmoji}
            </div>
          )}
        </div>
        <div className={styles.infoSection}>
          <div className={styles.teamNameSection}>
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className={styles.teamNameInput}
                autoFocus
                disabled={isUpdatingTeamName}
              />
            ) : (
              <h2
                className={styles.teamName}
                onClick={handleNameClick}
                title={teamId ? 'Click to edit team name' : ''}
              >
                {teamName || 'Untitled Team'}
              </h2>
            )}
          </div>
          {username && (
            <div className={styles.username}>{username}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

