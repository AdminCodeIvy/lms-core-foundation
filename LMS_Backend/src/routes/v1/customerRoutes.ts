import { Router } from 'express';
import { CustomerController } from '../../controllers/customerController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const customerController = new CustomerController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/customers
 * @desc    Get all customers with filters
 * @access  Private (All roles)
 */
router.get('/', customerController.getCustomers);

/**
 * @route   GET /api/v1/customers/generate-reference-id
 * @desc    Generate new customer reference ID
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.get(
  '/generate-reference-id',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  customerController.generateReferenceId
);

/**
 * @route   GET /api/v1/customers/:id
 * @desc    Get customer by ID
 * @access  Private (All roles)
 */
router.get('/:id', customerController.getCustomer);

/**
 * @route   POST /api/v1/customers
 * @desc    Create new customer
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  customerController.createCustomer
);

/**
 * @route   PUT /api/v1/customers/:id
 * @desc    Update customer
 * @access  Private (INPUTTER, APPROVER, ADMINISTRATOR)
 */
router.put(
  '/:id',
  authorize('INPUTTER', 'APPROVER', 'ADMINISTRATOR'),
  customerController.updateCustomer
);

/**
 * @route   DELETE /api/v1/customers/:id
 * @desc    Delete customer
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.delete(
  '/:id',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  customerController.deleteCustomer
);

/**
 * @route   POST /api/v1/customers/:id/submit
 * @desc    Submit customer for approval
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/:id/submit',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  customerController.submitCustomer
);

/**
 * @route   PATCH /api/v1/customers/:id/archive
 * @desc    Archive customer
 * @access  Private (ADMINISTRATOR)
 */
router.patch(
  '/:id/archive',
  authorize('ADMINISTRATOR'),
  customerController.archiveCustomer
);

export default router;
