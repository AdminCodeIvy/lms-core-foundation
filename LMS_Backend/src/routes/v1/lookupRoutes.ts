import { Router } from 'express';
import { LookupController } from '../../controllers/lookupController';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const lookupController = new LookupController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/lookups/districts
 * @desc    Get all districts
 * @access  Private (All roles)
 */
router.get('/districts', lookupController.getDistricts);

/**
 * @route   GET /api/v1/lookups/sub-districts
 * @desc    Get sub-districts (optionally filtered by district)
 * @access  Private (All roles)
 */
router.get('/sub-districts', lookupController.getSubDistricts);

/**
 * @route   GET /api/v1/lookups/property-types
 * @desc    Get all property types
 * @access  Private (All roles)
 */
router.get('/property-types', lookupController.getPropertyTypes);

/**
 * @route   GET /api/v1/lookups/carriers
 * @desc    Get all carriers
 * @access  Private (All roles)
 */
router.get('/carriers', lookupController.getCarriers);

/**
 * @route   GET /api/v1/lookups/countries
 * @desc    Get all countries
 * @access  Private (All roles)
 */
router.get('/countries', lookupController.getCountries);

// Admin routes for districts
/**
 * @route   POST /api/v1/lookups/districts
 * @desc    Create new district
 * @access  Private (ADMINISTRATOR)
 */
router.post('/districts', authorize('ADMINISTRATOR'), lookupController.createDistrict);

/**
 * @route   PUT /api/v1/lookups/districts/:id
 * @desc    Update district
 * @access  Private (ADMINISTRATOR)
 */
router.put('/districts/:id', authorize('ADMINISTRATOR'), lookupController.updateDistrict);

/**
 * @route   DELETE /api/v1/lookups/districts/:id
 * @desc    Delete district
 * @access  Private (ADMINISTRATOR)
 */
router.delete('/districts/:id', authorize('ADMINISTRATOR'), lookupController.deleteDistrict);

// Admin routes for sub-districts
/**
 * @route   POST /api/v1/lookups/sub-districts
 * @desc    Create new sub-district
 * @access  Private (ADMINISTRATOR)
 */
router.post('/sub-districts', authorize('ADMINISTRATOR'), lookupController.createSubDistrict);

/**
 * @route   PUT /api/v1/lookups/sub-districts/:id
 * @desc    Update sub-district
 * @access  Private (ADMINISTRATOR)
 */
router.put('/sub-districts/:id', authorize('ADMINISTRATOR'), lookupController.updateSubDistrict);

/**
 * @route   DELETE /api/v1/lookups/sub-districts/:id
 * @desc    Delete sub-district
 * @access  Private (ADMINISTRATOR)
 */
router.delete('/sub-districts/:id', authorize('ADMINISTRATOR'), lookupController.deleteSubDistrict);

// Admin routes for property types
/**
 * @route   POST /api/v1/lookups/property-types
 * @desc    Create new property type
 * @access  Private (ADMINISTRATOR)
 */
router.post('/property-types', authorize('ADMINISTRATOR'), lookupController.createPropertyType);

/**
 * @route   PUT /api/v1/lookups/property-types/:id
 * @desc    Update property type
 * @access  Private (ADMINISTRATOR)
 */
router.put('/property-types/:id', authorize('ADMINISTRATOR'), lookupController.updatePropertyType);

/**
 * @route   DELETE /api/v1/lookups/property-types/:id
 * @desc    Delete property type
 * @access  Private (ADMINISTRATOR)
 */
router.delete('/property-types/:id', authorize('ADMINISTRATOR'), lookupController.deletePropertyType);

// Admin routes for carriers
/**
 * @route   POST /api/v1/lookups/carriers
 * @desc    Create new carrier
 * @access  Private (ADMINISTRATOR)
 */
router.post('/carriers', authorize('ADMINISTRATOR'), lookupController.createCarrier);

/**
 * @route   PUT /api/v1/lookups/carriers/:id
 * @desc    Update carrier
 * @access  Private (ADMINISTRATOR)
 */
router.put('/carriers/:id', authorize('ADMINISTRATOR'), lookupController.updateCarrier);

/**
 * @route   DELETE /api/v1/lookups/carriers/:id
 * @desc    Delete carrier
 * @access  Private (ADMINISTRATOR)
 */
router.delete('/carriers/:id', authorize('ADMINISTRATOR'), lookupController.deleteCarrier);

// Admin routes for countries
/**
 * @route   POST /api/v1/lookups/countries
 * @desc    Create new country
 * @access  Private (ADMINISTRATOR)
 */
router.post('/countries', authorize('ADMINISTRATOR'), lookupController.createCountry);

/**
 * @route   PUT /api/v1/lookups/countries/:id
 * @desc    Update country
 * @access  Private (ADMINISTRATOR)
 */
router.put('/countries/:id', authorize('ADMINISTRATOR'), lookupController.updateCountry);

/**
 * @route   DELETE /api/v1/lookups/countries/:id
 * @desc    Delete country
 * @access  Private (ADMINISTRATOR)
 */
router.delete('/countries/:id', authorize('ADMINISTRATOR'), lookupController.deleteCountry);

export default router;
