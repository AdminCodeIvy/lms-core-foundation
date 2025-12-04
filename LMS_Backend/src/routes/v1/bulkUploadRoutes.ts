import { Router } from 'express';
import { BulkUploadController } from '../../controllers/bulkUploadController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const bulkUploadController = new BulkUploadController();

// All routes require authentication and ADMINISTRATOR role only
router.use(authenticate);
router.use(authorize('ADMINISTRATOR'));

/**
 * @route   POST /api/v1/bulk-upload/validate
 * @desc    Validate bulk upload data
 * @access  Private (ADMINISTRATOR)
 */
router.post('/validate', bulkUploadController.validateUpload);

/**
 * @route   POST /api/v1/bulk-upload/commit
 * @desc    Commit bulk upload data
 * @access  Private (ADMINISTRATOR)
 */
router.post('/commit', bulkUploadController.commitUpload);

/**
 * @route   GET /api/v1/bulk-upload/template/:entityType
 * @desc    Generate upload template
 * @access  Private (ADMINISTRATOR)
 */
router.get('/template/:entityType', bulkUploadController.generateTemplate);

export default router;
