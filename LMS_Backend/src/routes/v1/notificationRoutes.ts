import { Router } from 'express';
import { NotificationController } from '../../controllers/notificationController';
import { authenticate } from '../../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private (All roles)
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private (All roles)
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (All roles)
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (All roles)
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

export default router;
