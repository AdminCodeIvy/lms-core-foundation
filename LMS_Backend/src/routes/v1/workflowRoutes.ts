import { Router } from 'express';
import { WorkflowController } from '../../controllers/workflowController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const workflowController = new WorkflowController();

// All routes require authentication and APPROVER or ADMINISTRATOR role
router.use(authenticate);
router.use(authorize('APPROVER', 'ADMINISTRATOR'));

/**
 * @route   GET /api/v1/workflow/review-queue
 * @desc    Get review queue (pending approvals)
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.get('/review-queue', workflowController.getReviewQueue);

/**
 * @route   GET /api/v1/workflow/review/:entityType/:id
 * @desc    Get review item details
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.get('/review/:entityType/:id', workflowController.getReviewItem);

/**
 * @route   POST /api/v1/workflow/customers/:id/approve
 * @desc    Approve customer
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.post('/customers/:id/approve', workflowController.approveCustomer);

/**
 * @route   POST /api/v1/workflow/customers/:id/reject
 * @desc    Reject customer
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.post('/customers/:id/reject', workflowController.rejectCustomer);

/**
 * @route   POST /api/v1/workflow/properties/:id/approve
 * @desc    Approve property
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.post('/properties/:id/approve', workflowController.approveProperty);

/**
 * @route   POST /api/v1/workflow/properties/:id/reject
 * @desc    Reject property
 * @access  Private (APPROVER, ADMINISTRATOR)
 */
router.post('/properties/:id/reject', workflowController.rejectProperty);

export default router;
