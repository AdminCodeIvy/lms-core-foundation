import { Router } from 'express';
import { TaxController } from '../../controllers/taxController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const taxController = new TaxController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/tax/assessments
 * @desc    Get all tax assessments with filters
 * @access  Private (All roles)
 */
router.get('/assessments', taxController.getAssessments);

/**
 * @route   GET /api/v1/tax/stats
 * @desc    Get tax statistics
 * @access  Private (All roles)
 */
router.get('/stats', taxController.getTaxStats);

/**
 * @route   GET /api/v1/tax/assessments/:id
 * @desc    Get tax assessment by ID
 * @access  Private (All roles)
 */
router.get('/assessments/:id', taxController.getAssessment);

/**
 * @route   GET /api/v1/tax/assessments/:id/payments
 * @desc    Get payments for an assessment
 * @access  Private (All roles)
 */
router.get('/assessments/:id/payments', taxController.getPayments);

/**
 * @route   POST /api/v1/tax/assessments
 * @desc    Create new tax assessment
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/assessments',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  taxController.createAssessment
);

/**
 * @route   PUT /api/v1/tax/assessments/:id
 * @desc    Update tax assessment
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.put(
  '/assessments/:id',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  taxController.updateAssessment
);

/**
 * @route   DELETE /api/v1/tax/assessments/:id
 * @desc    Delete tax assessment
 * @access  Private (ADMINISTRATOR)
 */
router.delete(
  '/assessments/:id',
  authorize('ADMINISTRATOR'),
  taxController.deleteAssessment
);

/**
 * @route   PATCH /api/v1/tax/assessments/:id/archive
 * @desc    Archive tax assessment
 * @access  Private (ADMINISTRATOR)
 */
router.patch(
  '/assessments/:id/archive',
  authorize('ADMINISTRATOR'),
  taxController.archiveAssessment
);

/**
 * @route   POST /api/v1/tax/payments
 * @desc    Create new payment
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/payments',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  taxController.createPayment
);

export default router;
