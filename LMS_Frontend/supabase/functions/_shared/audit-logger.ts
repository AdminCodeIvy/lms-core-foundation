import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

export interface AuditLogEntry {
  entityType: 'customer' | 'property' | 'tax_assessment' | 'tax_payment' | 'user';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'submit' | 'approve' | 'reject' | 'archive';
  field?: string;
  oldValue?: any;
  newValue?: any;
  userId: string;
}

/**
 * Log a single audit entry
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        field: entry.field || null,
        old_value: entry.oldValue !== undefined ? String(entry.oldValue) : null,
        new_value: entry.newValue !== undefined ? String(entry.newValue) : null,
        changed_by: entry.userId,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Error logging audit:', error);
      throw error;
    }

    console.log(`Audit logged: ${entry.action} on ${entry.entityType}:${entry.entityId}`);
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - we don't want audit logging to break the main operation
  }
}

/**
 * Log multiple audit entries (for tracking multiple field changes)
 */
export async function logAuditBatch(
  supabase: SupabaseClient,
  entries: AuditLogEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  try {
    const auditEntries = entries.map(entry => ({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      field: entry.field || null,
      old_value: entry.oldValue !== undefined ? String(entry.oldValue) : null,
      new_value: entry.newValue !== undefined ? String(entry.newValue) : null,
      changed_by: entry.userId,
      timestamp: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntries);

    if (error) {
      console.error('Error logging audit batch:', error);
      throw error;
    }

    console.log(`Audit batch logged: ${entries.length} entries`);
  } catch (error) {
    console.error('Failed to log audit entries:', error);
    // Don't throw - we don't want audit logging to break the main operation
  }
}

/**
 * Compare two objects and generate audit log entries for changed fields
 */
export function generateFieldChangeLogs(
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId: string,
  action: 'create' | 'update' = 'update'
): AuditLogEntry[] {
  const logs: AuditLogEntry[] = [];

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const field of allKeys) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Skip internal fields
    if (['updated_at', 'created_at', 'id'].includes(field)) continue;

    logs.push({
      entityType,
      entityId,
      action,
      field,
      oldValue,
      newValue,
      userId,
    });
  }

  return logs;
}
