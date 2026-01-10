'use client';

import { useState, useEffect } from 'react';
import { Week } from '@/lib/domain/types';
import { formatDeadlineDate, calculateTimeRemaining } from '@/lib/utils/date-utils';
import styles from './TeamSelectionHeader.module.scss';

interface TeamSelectionHeaderProps {
  week: Week | null;
  viewMode: 'pitch' | 'list';
  onViewModeChange: (mode: 'pitch' | 'list') => void;
  teamName: string;
  teamId: string;
  onTeamNameUpdate: (newName: string) => Promise<void>;
  isUpdatingTeamName?: boolean;
}

export function TeamSelectionHeader({ 
  week, 
  viewMode, 
  onViewModeChange,
  teamName,
  teamId,
  onTeamNameUpdate,
  isUpdatingTeamName = false,
}: TeamSelectionHeaderProps) {
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState(teamName);

  // Sync editedTeamName when teamName prop changes (e.g., after successful update)
  useEffect(() => {
    if (!isEditingTeamName) {
      setEditedTeamName(teamName);
    }
  }, [teamName, isEditingTeamName]);

  const deadlineFormatted = week?.transfer_cutoff_time 
    ? formatDeadlineDate(week.transfer_cutoff_time)
    : 'No deadline set';
  
  const timeRemaining = week?.transfer_cutoff_time 
    ? calculateTimeRemaining(week.transfer_cutoff_time)
    : null;

  const handleTeamNameClick = () => {
    if (!isUpdatingTeamName && teamId) {
      setIsEditingTeamName(true);
    }
  };

  const handleTeamNameSave = async () => {
    if (!editedTeamName.trim() || editedTeamName.trim() === teamName) {
      setIsEditingTeamName(false);
      setEditedTeamName(teamName);
      return;
    }

    try {
      await onTeamNameUpdate(editedTeamName.trim());
      setIsEditingTeamName(false);
    } catch (error) {
      // Error handling is done by the mutation hook (toast notification)
      // Reset to original name on error
      setEditedTeamName(teamName);
      setIsEditingTeamName(false);
    }
  };

  const handleTeamNameCancel = () => {
    setEditedTeamName(teamName);
    setIsEditingTeamName(false);
  };

  const handleTeamNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTeamNameSave();
    } else if (e.key === 'Escape') {
      handleTeamNameCancel();
    }
  };

  return (
    <div className={styles.header}>
      <div className={styles.teamNameRow}>
        {isEditingTeamName ? (
          <div className={styles.teamNameEdit}>
            <input
              type="text"
              value={editedTeamName}
              onChange={(e) => setEditedTeamName(e.target.value)}
              onBlur={handleTeamNameSave}
              onKeyDown={handleTeamNameKeyDown}
              className={styles.teamNameInput}
              autoFocus
              disabled={isUpdatingTeamName}
            />
            <div className={styles.teamNameActions}>
              <button
                onClick={handleTeamNameSave}
                disabled={isUpdatingTeamName || !editedTeamName.trim()}
                className={styles.saveButton}
              >
                {isUpdatingTeamName ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleTeamNameCancel}
                disabled={isUpdatingTeamName}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={styles.teamNameDisplay}
            onClick={handleTeamNameClick}
            title={teamId ? 'Click to edit team name' : ''}
          >
            <h1 className={styles.teamNameText}>
              {teamName || 'Untitled Team'}
            </h1>
            {teamId && (
              <span className={styles.editHint}>Click to edit</span>
            )}
          </div>
        )}
      </div>
      <div className={styles.topRow}>
        <div className={styles.weekInfo}>
          {week?.name || `Week ${week?.week_number || ''}`}
        </div>
        <div className={styles.deadline}>
          Deadline: {deadlineFormatted}
        </div>
        <div className={styles.countdown}>
          {timeRemaining ? (
            <>Window closes in {timeRemaining.formatted}</>
          ) : (
            'No deadline set'
          )}
        </div>
      </div>
      {/* <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${viewMode === 'pitch' ? styles.active : ''}`}
          onClick={() => onViewModeChange('pitch')}
        >
          Pitch View
        </button>
        <button
          className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => onViewModeChange('list')}
        >
          List View
        </button>
      </div> */}
    </div>
  );
}

