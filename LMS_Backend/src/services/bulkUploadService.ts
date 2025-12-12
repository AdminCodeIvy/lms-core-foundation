/**
 * Compatibility wrapper for the old bulkUploadService
 * This file maintains backward compatibility while using the new modular system
 */

import { BulkUploadService as ModularBulkUploadService } from './bulkUpload';

// Re-export the new service with the old name for compatibility
export const BulkUploadService = ModularBulkUploadService;

// Export types for backward compatibility
export * from './bulkUpload/types';
