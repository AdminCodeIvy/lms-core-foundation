import { Router } from 'express';
import { ActivityLogController } from '../../controllers/activityLogController';
import { authenticate } from '../../middleware/auth';

const router = Router();
const activityLogController = new ActivityLogController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/activity-logs
 * @desc    Get activity logs with filters
 * @access  Private (All roles)
 */
router.get('/', activityLogController.getActivityLogs);

/**
 * @route   GET /api/v1/activity-logs/:entityType/:entityId
 * @desc    Get activity logs for a specific entity
 * @access  Private (All roles)
 */
router.get('/:entityType/:entityId', activityLogController.getActivityLogsByEntity);

export default router;
