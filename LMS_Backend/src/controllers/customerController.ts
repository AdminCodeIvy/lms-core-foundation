import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CustomerService } from '../services/customerService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const customerService = new CustomerService();

export class CustomerController {
  async getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        type: req.query.type as string,
        status: req.query.status as string,
        search: req.query.search as string,
        showArchived: req.query.showArchived === 'true',
        district_id: req.query.district_id as string,
        updated_from: req.query.updated_from as string,
        updated_to: req.query.updated_to as string,
      };

      const result = await customerService.getCustomers(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomer(id);
      ResponseHandler.success(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      // Debug logging
      logger.info(`Creating customer - User ID: ${req.user.id}, Customer Type: ${req.body.customer_type}`);

      if (!req.user.id) {
        logger.error('User ID is missing from authenticated request');
        ResponseHandler.badRequest(res, 'User authentication error');
        return;
      }

      const customer = await customerService.createCustomer(req.body, req.user.id);
      logger.info(`Customer created: ${customer.reference_id} by ${req.user.email}`);
      ResponseHandler.created(res, customer, 'Customer created successfully');
    } catch (error) {
      logger.error('Customer creation error:', error);
      next(error);
    }
  }

  async updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      const { id } = req.params;
      const customer = await customerService.updateCustomer(id, req.body, req.user.id);
      logger.info(`Customer updated: ${id} by ${req.user.email}`);
      ResponseHandler.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      const { id } = req.params;
      await customerService.deleteCustomer(id, req.user.id);
      logger.info(`Customer deleted: ${id} by ${req.user.email}`);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async submitCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      const { id } = req.params;
      const customer = await customerService.submitCustomer(id, req.user.id);
      logger.info(`Customer submitted: ${id} by ${req.user.email}`);
      ResponseHandler.success(res, customer, 'Customer submitted for approval');
    } catch (error) {
      next(error);
    }
  }

  async archiveCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      const { id } = req.params;
      const customer = await customerService.archiveCustomer(id, req.user.id);
      logger.info(`Customer archived: ${id} by ${req.user.email}`);
      ResponseHandler.success(res, customer, 'Customer archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateReferenceId(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const referenceId = await customerService.generateReferenceId();
      ResponseHandler.success(res, { referenceId });
    } catch (error) {
      next(error);
    }
  }
}
