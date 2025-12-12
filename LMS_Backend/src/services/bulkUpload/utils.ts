/**
 * Utility functions for bulk upload operations
 */

/**
 * Helper function to get value with flexible column names
 */
export const getValue = (data: any, ...possibleKeys: string[]) => {
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key];
    }
  }
  // Try case-insensitive and trimmed matches
  const dataKeys = Object.keys(data);
  for (const possibleKey of possibleKeys) {
    for (const dataKey of dataKeys) {
      if (dataKey.trim().toLowerCase() === possibleKey.toLowerCase()) {
        if (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '') {
          return data[dataKey];
        }
      }
    }
  }
  return null;
};

/**
 * Check if a value is empty
 */
export const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '' || 
         (typeof value === 'string' && value.trim() === '');
};

/**
 * Check if a value is a valid UUID
 */
export const isValidUUID = (value: any): boolean => {
  if (!value || typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Clean UUID fields (convert invalid/placeholder to null)
 */
export const cleanUUID = (value: any): string | null => {
  if (!value) return null;
  const strValue = String(value).trim();
  // Check if it's a placeholder or invalid UUID
  if (strValue.includes('PASTE') || strValue.includes('optional') || strValue.includes('UUID') || !isValidUUID(strValue)) {
    return null;
  }
  return strValue;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate mobile number format
 */
export const isValidMobileNumber = (mobile: string): boolean => {
  const mobileRegex = /^\+\d{1,3}-?\d{3,4}-?\d{3,4}-?\d{3,4}$/;
  return mobileRegex.test(mobile);
};

/**
 * Convert Excel date to YYYY-MM-DD format
 */
export const convertExcelDate = (value: any): string | null => {
  if (!value || value === 'Not found' || value === 'Not Found' || value === '') {
    return null;
  }

  // If it's already in YYYY-MM-DD format, return as is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // If it's just a year (like "1942"), convert to Jan 1st of that year
  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    return `${value}-01-01`;
  }

  // If it's an Excel serial number (number > 1000), convert it
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 1000) {
    // Excel serial date conversion (Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const convertedDate = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
    
    const year = convertedDate.getFullYear();
    const month = String(convertedDate.getMonth() + 1).padStart(2, '0');
    const day = String(convertedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // If it's a string that might be a date, try to parse it
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Default fallback
  return '1990-01-01';
};

/**
 * Normalize gender values
 */
export const normalizeGender = (value: any): string => {
  if (!value) return 'MALE';
  
  const cleaned = value.toString().trim().toUpperCase();
  
  // Handle common variations
  if (cleaned === 'MALE' || cleaned === 'M' || cleaned === 'MAN') return 'MALE';
  if (cleaned === 'FEMALE' || cleaned === 'FEMAL' || cleaned === 'F' || cleaned === 'WOMAN') return 'FEMALE';
  if (cleaned === 'NOT FOUND' || cleaned === 'NOT_FOUND' || cleaned === 'UNKNOWN') return 'MALE';
  
  // Default to MALE if unclear
  return 'MALE';
};