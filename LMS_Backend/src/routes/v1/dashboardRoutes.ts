import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboardController';
import { authenticate } from '../../middleware/auth';

const router = Router();
const dashboardController = new DashboardController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (All roles)
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @route   GET /api/v1/dashboard/tax-stats
 * @desc    Get tax statistics
 * @access  Private (All roles)
 */
router.get('/tax-stats', dashboardController.getTaxStats);

export default router;
