import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PropertyService } from '../services/propertyService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const propertyService = new PropertyService();

export class PropertyController {
  async getProperties(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        type: req.query.type as string,
        districtId: req.query.districtId as string,
        subDistrictId: req.query.subDistrictId as string,
        search: req.query.search as string,
        showArchived: req.query.showArchived === 'true',
      };

      const result = await propertyService.getProperties(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.getProperty(id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await propertyService.createProperty(req.body, req.user!.id);
      logger.info(`Property created: ${data.reference_id} by ${req.user!.email}`);
      ResponseHandler.created(res, data, 'Property created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.updateProperty(id, req.body, req.user!.id);
      logger.info(`Property updated: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await propertyService.deleteProperty(id, req.user!.id);
      logger.info(`Property deleted: ${id} by ${req.user!.email}`);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async submitProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.submitProperty(id, req.user!.id);
      logger.info(`Property submitted: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property submitted for approval');
    } catch (error) {
      next(error);
    }
  }

  async archiveProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.archiveProperty(id, req.user!.id);
      logger.info(`Property archived: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateReferenceId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const referenceId = await propertyService.generateReferenceId();
      ResponseHandler.success(res, { referenceId });
    } catch (error) {
      next(error);
    }
  }

  async generateParcelNumber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { districtId, subDistrictId } = req.query;
      
      if (!districtId || !subDistrictId) {
        ResponseHandler.badRequest(res, 'District ID and Sub-district ID are required');
        return;
      }

      const parcelNumber = await propertyService.generateParcelNumber(
        districtId as string,
        subDistrictId as string
      );
      ResponseHandler.success(res, { parcelNumber });
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        ResponseHandler.badRequest(res, 'No file uploaded');
        return;
      }

      const { id } = req.params;
      const data = await propertyService.uploadPhoto(id, req.file, req.user!.id);
      ResponseHandler.created(res, data, 'Photo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { photoId } = req.params;
      await propertyService.deletePhoto(photoId, req.user!.id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getPropertyForTax(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.getPropertyForTax(id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async searchProperties(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q) {
        ResponseHandler.badRequest(res, 'Search query is required');
        return;
      }

      const data = await propertyService.searchProperties(q as string);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async syncToAGO(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await propertyService.syncToAGO(id, req.user!.id);
      logger.info(`Property synced to AGO: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property synced to AGO successfully');
    } catch (error) {
      next(error);
    }
  }
}
