import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LookupService } from '../services/lookupService';
import { ResponseHandler } from '../utils/response';

const lookupService = new LookupService();

export class LookupController {
  // Get all districts
  async getDistricts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getDistricts();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Get sub-districts
  async getSubDistricts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { districtId } = req.query;
      const data = await lookupService.getSubDistricts(districtId as string);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Get property types
  async getPropertyTypes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getPropertyTypes();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Get carriers
  async getCarriers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getCarriers();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Get countries
  async getCountries(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getCountries();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create district
  async createDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.createDistrict(req.body);
      ResponseHandler.created(res, data, 'District created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update district
  async updateDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await lookupService.updateDistrict(id, req.body);
      ResponseHandler.success(res, data, 'District updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete district
  async deleteDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await lookupService.deleteDistrict(id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create sub-district
  async createSubDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.createSubDistrict(req.body);
      ResponseHandler.created(res, data, 'Sub-district created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update sub-district
  async updateSubDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await lookupService.updateSubDistrict(id, req.body);
      ResponseHandler.success(res, data, 'Sub-district updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete sub-district
  async deleteSubDistrict(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await lookupService.deleteSubDistrict(id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create property type
  async createPropertyType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.createPropertyType(req.body);
      ResponseHandler.created(res, data, 'Property type created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update property type
  async updatePropertyType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await lookupService.updatePropertyType(id, req.body);
      ResponseHandler.success(res, data, 'Property type updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete property type
  async deletePropertyType(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await lookupService.deletePropertyType(id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create carrier
  async createCarrier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.createCarrier(req.body);
      ResponseHandler.created(res, data, 'Carrier created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update carrier
  async updateCarrier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await lookupService.updateCarrier(id, req.body);
      ResponseHandler.success(res, data, 'Carrier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete carrier
  async deleteCarrier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await lookupService.deleteCarrier(id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create country
  async createCountry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.createCountry(req.body);
      ResponseHandler.created(res, data, 'Country created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update country
  async updateCountry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await lookupService.updateCountry(id, req.body);
      ResponseHandler.success(res, data, 'Country updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete country
  async deleteCountry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await lookupService.deleteCountry(id);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}
