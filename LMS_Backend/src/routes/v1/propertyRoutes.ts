import { Router } from 'express';
import { PropertyController } from '../../controllers/propertyController';
import { authenticate, authorize } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();
const propertyController = new PropertyController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/properties
 * @desc    Get all properties with filters
 * @access  Private (All roles)
 */
router.get('/', propertyController.getProperties);

/**
 * @route   GET /api/v1/properties/generate-reference-id
 * @desc    Generate new property reference ID
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.get(
  '/generate-reference-id',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.generateReferenceId
);

/**
 * @route   GET /api/v1/properties/generate-parcel-number
 * @desc    Generate new parcel number
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.get(
  '/generate-parcel-number',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.generateParcelNumber
);

/**
 * @route   GET /api/v1/properties/search
 * @desc    Search properties
 * @access  Private (All roles)
 */
router.get('/search', propertyController.searchProperties);

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get property by ID
 * @access  Private (All roles)
 */
router.get('/:id', propertyController.getProperty);

/**
 * @route   GET /api/v1/properties/:id/for-tax
 * @desc    Get property for tax assessment
 * @access  Private (All roles)
 */
router.get('/:id/for-tax', propertyController.getPropertyForTax);

/**
 * @route   POST /api/v1/properties
 * @desc    Create new property
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.createProperty
);

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Private (INPUTTER, APPROVER, ADMINISTRATOR)
 */
router.put(
  '/:id',
  authorize('INPUTTER', 'APPROVER', 'ADMINISTRATOR'),
  propertyController.updateProperty
);

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete property
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.delete(
  '/:id',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.deleteProperty
);

/**
 * @route   POST /api/v1/properties/:id/submit
 * @desc    Submit property for approval
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/:id/submit',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.submitProperty
);

/**
 * @route   PATCH /api/v1/properties/:id/archive
 * @desc    Archive property
 * @access  Private (ADMINISTRATOR)
 */
router.patch(
  '/:id/archive',
  authorize('ADMINISTRATOR'),
  propertyController.archiveProperty
);

/**
 * @route   POST /api/v1/properties/:id/photos
 * @desc    Upload property photo
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.post(
  '/:id/photos',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  upload.single('photo'),
  propertyController.uploadPhoto
);

/**
 * @route   DELETE /api/v1/properties/photos/:photoId
 * @desc    Delete property photo
 * @access  Private (INPUTTER, ADMINISTRATOR)
 */
router.delete(
  '/photos/:photoId',
  authorize('INPUTTER', 'ADMINISTRATOR'),
  propertyController.deletePhoto
);

/**
 * @route   POST /api/v1/properties/:id/sync-ago
 * @desc    Sync property to AGO
 * @access  Private (ADMINISTRATOR)
 */
router.post(
  '/:id/sync-ago',
  authorize('ADMINISTRATOR'),
  propertyController.syncToAGO
);

export default router;
