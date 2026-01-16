'use client';

import { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync editedName when teamName prop changes
  useEffect(() => {
    if (!isEditingName) {
      setEditedName(teamName);
    }
  }, [teamName, isEditingName]);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPickerOpen]);

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
      setIsPickerOpen(true);
    }
  };

  const handleEmojiSelect = async (emojiData: EmojiClickData) => {
    if (!onTeamEmojiUpdate) return;
    
    setIsPickerOpen(false);
    
    if (emojiData.emoji === teamEmoji) return;
    
    try {
      await onTeamEmojiUpdate(emojiData.emoji);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  return (
    <Card className={styles.teamCard}>
      <div className={styles.content}>
        <div className={styles.emojiSection} ref={pickerRef}>
          <div
            className={`${styles.emojiDisplay} ${onTeamEmojiUpdate ? styles.editable : ''}`}
            onClick={handleEmojiClick}
            title={onTeamEmojiUpdate ? 'Click to change emoji' : ''}
          >
            {teamEmoji}
          </div>
          {isPickerOpen && (
            <div className={styles.emojiPickerWrapper}>
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                theme={Theme.AUTO}
                width={320}
                height={400}
                searchPlaceholder="Search emojis..."
                previewConfig={{ showPreview: false }}
              />
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


