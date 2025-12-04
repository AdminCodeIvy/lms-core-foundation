import { ActivityLogService } from '../services/activityLogService';

const activityLogService = new ActivityLogService();

export class ActivityLogger {
  static async log(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    field?: string,
    oldValue?: any,
    newValue?: any
  ) {
    try {
      await activityLogService.createActivityLog({
        entityType,
        entityId,
        action,
        field,
        oldValue,
        newValue,
        userId,
      });
    } catch (error) {
      console.error('Failed to create activity log:', error);
      // Don't throw - activity logging should not break the main flow
    }
  }

  static async logCreate(entityType: string, entityId: string, userId: string) {
    return this.log(entityType, entityId, 'create', userId, 'status', null, 'DRAFT');
  }

  static async logUpdate(
    entityType: string,
    entityId: string,
    userId: string,
    field: string,
    oldValue: any,
    newValue: any
  ) {
    return this.log(entityType, entityId, 'update', userId, field, oldValue, newValue);
  }

  static async logDelete(entityType: string, entityId: string, userId: string) {
    return this.log(entityType, entityId, 'delete', userId, 'status', 'DRAFT', 'DELETED');
  }

  static async logSubmit(entityType: string, entityId: string, userId: string) {
    return this.log(entityType, entityId, 'submit', userId, 'status', 'DRAFT', 'SUBMITTED');
  }

  static async logApprove(entityType: string, entityId: string, userId: string) {
    return this.log(entityType, entityId, 'approve', userId, 'status', 'SUBMITTED', 'APPROVED');
  }

  static async logReject(entityType: string, entityId: string, userId: string) {
    return this.log(entityType, entityId, 'reject', userId, 'status', 'SUBMITTED', 'REJECTED');
  }

  static async logArchive(entityType: string, entityId: string, userId: string, oldStatus: string) {
    return this.log(entityType, entityId, 'archive', userId, 'status', oldStatus, 'ARCHIVED');
  }
}
