/**
 * Formats a UK vehicle registration number with proper spacing
 * Handles multiple UK reg formats:
 * - Current format (2001+): AB12 CDE
 * - Prefix format (1983-2001): A123 BCD
 * - Suffix format (1963-1983): ABC 123D
 * - Dateless format (pre-1963): ABC 123
 */
export function formatUKRegistration(reg) {
  if (!reg) return '';
  
  // Remove all spaces and convert to uppercase
  const cleaned = reg.replace(/\s/g, '').toUpperCase();
  
  // If already has correct spacing or is empty, return as is
  if (cleaned.length === 0) return '';
  
  // Current format (2001+): AB12 CDE (2 letters, 2 numbers, 3 letters)
  if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  
  // Prefix format (1983-2001): A123 BCD (1 letter, 1-3 numbers, 3 letters)
  if (/^[A-Z]\d{1,3}[A-Z]{3}$/.test(cleaned)) {
    const letters = cleaned.match(/^[A-Z]/)[0];
    const numbers = cleaned.match(/\d{1,3}/)[0];
    const endLetters = cleaned.match(/[A-Z]{3}$/)[0];
    return `${letters}${numbers} ${endLetters}`;
  }
  
  // Suffix format (1963-1983): ABC 123D (3 letters, 1-3 numbers, 1 letter)
  if (/^[A-Z]{3}\d{1,3}[A-Z]$/.test(cleaned)) {
    const letters = cleaned.match(/^[A-Z]{3}/)[0];
    const numbers = cleaned.match(/\d{1,3}/)[0];
    const endLetter = cleaned.match(/[A-Z]$/)[0];
    return `${letters} ${numbers}${endLetter}`;
  }
  
  // Dateless format (pre-1963): ABC 123 (3 letters, 1-3 numbers)
  if (/^[A-Z]{3}\d{1,3}$/.test(cleaned)) {
    const letters = cleaned.match(/^[A-Z]{3}/)[0];
    const numbers = cleaned.match(/\d{1,3}$/)[0];
    return `${letters} ${numbers}`;
  }
  
  // If no format matches, return as uppercase without modification
  // This handles edge cases and invalid formats
  return cleaned;
}