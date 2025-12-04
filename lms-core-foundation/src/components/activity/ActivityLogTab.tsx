import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus,
  Edit,
  ArrowUp,
  Check,
  X,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  timestamp: string;
  changes: Array<{
    field: string;
    old_value: string;
    new_value: string;
  }> | null;
  metadata: Record<string, any> | null;
}

interface ActivityLogTabProps {
  customerId: string;
}

export function ActivityLogTab({ customerId }: ActivityLogTabProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActivityLogs();
  }, [customerId]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-activity-logs', {
        body: { customer_id: customerId },
      });

      if (error) throw error;

      setLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <Plus className="h-5 w-5 text-blue-600" />;
      case 'UPDATED':
        return <Edit className="h-5 w-5 text-orange-600" />;
      case 'SUBMITTED':
        return <ArrowUp className="h-5 w-5 text-blue-600" />;
      case 'APPROVED':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'REJECTED':
        return <X className="h-5 w-5 text-red-600" />;
      case 'ARCHIVED':
        return <Archive className="h-5 w-5 text-gray-600" />;
      default:
        return <Edit className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionDescription = (log: ActivityLogEntry) => {
    switch (log.action) {
      case 'CREATED':
        return `Created by ${log.performed_by_name}`;
      case 'UPDATED':
        return `Updated by ${log.performed_by_name}`;
      case 'SUBMITTED':
        return `Submitted for approval by ${log.performed_by_name}`;
      case 'APPROVED':
        return `Approved by ${log.performed_by_name}`;
      case 'REJECTED':
        return `Rejected by ${log.performed_by_name}`;
      case 'ARCHIVED':
        return `Archived by ${log.performed_by_name}`;
      default:
        return `Action by ${log.performed_by_name}`;
    }
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No activity recorded yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {logs.map((log, index) => (
        <div key={log.id} className="relative">
          {/* Timeline line */}
          {index < logs.length - 1 && (
            <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
          )}

          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
              {getActionIcon(log.action)}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <Card className="p-4">
                <div className="space-y-2">
                  {/* Action description */}
                  <p className="font-semibold">{getActionDescription(log)}</p>

                  {/* Timestamp */}
                  <p className="text-sm text-muted-foreground" title={new Date(log.timestamp).toLocaleString()}>
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </p>

                  {/* Changes (for UPDATED action) */}
                  {log.action === 'UPDATED' && log.changes && log.changes.length > 0 && (
                    <Collapsible
                      open={expandedLogs.has(log.id)}
                      onOpenChange={() => toggleExpanded(log.id)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline mt-2">
                        {expandedLogs.has(log.id) ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide changes
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show changes ({log.changes.length})
                          </>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">Field</th>
                                <th className="px-3 py-2 text-left font-medium">Old Value</th>
                                <th className="px-3 py-2 text-left font-medium">New Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {log.changes.map((change, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-3 py-2 font-medium">{change.field}</td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {change.old_value || <span className="italic">empty</span>}
                                  </td>
                                  <td className="px-3 py-2">{change.new_value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Rejection feedback */}
                  {log.action === 'REJECTED' && log.metadata?.rejection_feedback && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm font-medium mb-1">Rejection Feedback:</p>
                      <p className="text-sm">{log.metadata.rejection_feedback}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
