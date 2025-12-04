import { Router } from 'express';
import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import lookupRoutes from './lookupRoutes';
import propertyRoutes from './propertyRoutes';
import taxRoutes from './taxRoutes';
import workflowRoutes from './workflowRoutes';
import adminRoutes from './adminRoutes';
import dashboardRoutes from './dashboardRoutes';
import notificationRoutes from './notificationRoutes';
import bulkUploadRoutes from './bulkUploadRoutes';
import activityLogRoutes from './activityLogRoutes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/lookups', lookupRoutes);
router.use('/properties', propertyRoutes);
router.use('/tax', taxRoutes);
router.use('/workflow', workflowRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/bulk-upload', bulkUploadRoutes);
router.use('/activity-logs', activityLogRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

export default router;
