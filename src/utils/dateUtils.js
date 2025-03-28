import { format } from 'date-fns';

export const formatDate = (dateString) => {
  try {
    // Use a consistent format and locale
    return format(new Date(dateString), 'MMM d, yyyy h:mm a', {
      timeZone: 'UTC' // Use UTC to avoid timezone differences
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}; 