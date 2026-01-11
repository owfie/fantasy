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

/**
 * Convert a UTC ISO timestamp to a local datetime-local input value (YYYY-MM-DDTHH:mm)
 * This handles timezone conversion properly for datetime-local inputs
 */
export function utcToLocalDatetimeInput(utcIsoString: string | null | undefined): string {
  if (!utcIsoString) return '';
  
  const utcDate = new Date(utcIsoString);
  if (isNaN(utcDate.getTime())) return '';
  
  // Get local time components
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a local datetime-local input value (YYYY-MM-DDTHH:mm) to UTC ISO string
 * This handles timezone conversion properly - treats the input as local time and converts to UTC
 */
export function localDatetimeInputToUtc(localDatetimeString: string): string {
  if (!localDatetimeString) return '';
  
  // Parse the local datetime string (YYYY-MM-DDTHH:mm format)
  // Create a date in local timezone
  const localDate = new Date(localDatetimeString);
  
  if (isNaN(localDate.getTime())) return '';
  
  // Convert to UTC ISO string
  return localDate.toISOString();
}

/**
 * Create a UTC ISO timestamp from a date string (YYYY-MM-DD) and time components
 * This ensures the date is treated as local time and converted to UTC properly
 * @param dateString Date in YYYY-MM-DD format
 * @param hours Hours (0-23)
 * @param minutes Minutes (0-59)
 * @returns UTC ISO string
 */
export function createUtcTimestampFromLocalDate(dateString: string, hours: number, minutes: number): string {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Parse date components
  const dateParts = dateString.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(dateParts[2], 10);
  
  // Create date in local timezone
  const localDate = new Date(year, month, day, hours, minutes, 0, 0);
  
  // Convert to UTC ISO string
  return localDate.toISOString();
}

/**
 * Create a UTC ISO timestamp from an ACST (Australia/Adelaide) date and time
 * ACST is UTC+9:30 (no daylight saving)
 * @param dateString Date in YYYY-MM-DD format
 * @param hours Hours in ACST (0-23)
 * @param minutes Minutes (0-59)
 * @returns UTC ISO string
 */
export function createUtcTimestampFromACST(dateString: string, hours: number, minutes: number): string {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Parse date components
  const dateParts = dateString.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);
  
  // Create date string in ISO format with ACST timezone offset (+09:30)
  // JavaScript will parse this and convert to UTC automatically
  const acstDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+09:30`;
  
  // Parse as ACST time and convert to UTC ISO string
  const acstDate = new Date(acstDateString);
  
  if (isNaN(acstDate.getTime())) {
    throw new Error('Invalid date/time values');
  }
  
  return acstDate.toISOString();
}

/**
 * Format a UTC timestamp as an ACST date/time string
 * @param utcIsoString UTC ISO timestamp string
 * @param options Intl.DateTimeFormatOptions for formatting
 * @returns Formatted string in ACST
 */
export function formatInACST(utcIsoString: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!utcIsoString) return '';
  
  const utcDate = new Date(utcIsoString);
  if (isNaN(utcDate.getTime())) return '';
  
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'Australia/Adelaide',
  });
  
  return formatter.format(utcDate);
}

/**
 * Get ACST date components from a UTC timestamp
 * @param utcIsoString UTC ISO timestamp string
 * @returns Object with ACST date components
 */
export function getACSTDateComponents(utcIsoString: string | null | undefined): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  if (!utcIsoString) return null;
  
  const utcDate = new Date(utcIsoString);
  if (isNaN(utcDate.getTime())) return null;
  
  // Use Intl.DateTimeFormat to get ACST components
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Adelaide',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(utcDate);
  const partMap = new Map(parts.map(p => [p.type, p.value]));
  
  return {
    year: parseInt(partMap.get('year') || '0', 10),
    month: parseInt(partMap.get('month') || '0', 10),
    day: parseInt(partMap.get('day') || '0', 10),
    hours: parseInt(partMap.get('hour') || '0', 10),
    minutes: parseInt(partMap.get('minute') || '0', 10),
    seconds: parseInt(partMap.get('second') || '0', 10),
  };
}

