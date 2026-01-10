/**
 * Date utility functions for fantasy team selection UI
 */

/**
 * Format a date for display (e.g., "6:00pm Monday 12th January")
 */
export function formatDeadlineDate(date: Date | string | null | undefined): string {
  if (!date) return 'No deadline set';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[d.getDay()];
  
  const day = d.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[d.getMonth()];
  
  return `${displayHours}:${displayMinutes}${ampm} ${dayName} ${day}${getOrdinalSuffix(day)} ${monthName}`;
}

/**
 * Get ordinal suffix for a day (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Calculate time remaining until a deadline
 * Returns an object with days, hours, and minutes
 */
export function calculateTimeRemaining(deadline: Date | string | null | undefined): {
  days: number;
  hours: number;
  minutes: number;
  formatted: string;
} | null {
  if (!deadline) return null;
  
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (isNaN(deadlineDate.getTime())) return null;

  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Window closed',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let formatted = '';
  if (days > 0) {
    formatted = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    formatted = `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    formatted = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return { days, hours, minutes, formatted };
}

