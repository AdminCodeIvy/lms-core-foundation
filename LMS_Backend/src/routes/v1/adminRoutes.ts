import { Router } from 'express';
import { AdminController } from '../../controllers/adminController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const adminController = new AdminController();

// All routes require authentication and ADMINISTRATOR role
router.use(authenticate);
router.use(authorize('ADMINISTRATOR'));

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users
 * @access  Private (ADMINISTRATOR)
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (ADMINISTRATOR)
 */
router.get('/users/:id', adminController.getUser);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create new user
 * @access  Private (ADMINISTRATOR)
 */
router.post('/users', adminController.createUser);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user
 * @access  Private (ADMINISTRATOR)
 */
router.put('/users/:id', adminController.updateUser);

/**
 * @route   PATCH /api/v1/admin/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (ADMINISTRATOR)
 */
router.patch('/users/:id/deactivate', adminController.deactivateUser);

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (ADMINISTRATOR)
 */
router.get('/audit-logs', adminController.getAuditLogs);

/**
 * @route   GET /api/v1/admin/ago-settings
 * @desc    Get AGO settings
 * @access  Private (ADMINISTRATOR)
 */
router.get('/ago-settings', adminController.getAGOSettings);

/**
 * @route   PUT /api/v1/admin/ago-settings
 * @desc    Update AGO settings
 * @access  Private (ADMINISTRATOR)
 */
router.put('/ago-settings', adminController.updateAGOSettings);

/**
 * @route   POST /api/v1/admin/ago-settings/test
 * @desc    Test AGO connection
 * @access  Private (ADMINISTRATOR)
 */
router.post('/ago-settings/test', adminController.testAGOConnection);

export default router;
